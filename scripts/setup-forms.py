"""Provision the dedicated forms host using the account's cPanel API token."""
import json
import os
import urllib.request
import urllib.parse

HOST = os.environ['CPANEL_HOST']
USER = os.environ['CPANEL_USER']
assert HOST == 'buenosaires.servidoraweb.net' and USER == 'm20adminpanel'
TOKEN = os.environ['CPANEL_API_TOKEN']

def call(module, function, api2=False, **params):
    if api2:
        params.update(cpanel_jsonapi_user=USER, cpanel_jsonapi_apiversion=2, cpanel_jsonapi_module=module, cpanel_jsonapi_func=function)
        route = '/json-api/cpanel'
    else:
        route = f'/execute/{module}/{function}'
    req = urllib.request.Request(f'https://{HOST}:2083{route}', data=urllib.parse.urlencode(params).encode(), headers={'Authorization':f'cpanel {USER}:{TOKEN}'})
    with urllib.request.urlopen(req, timeout=120) as response:
        data = json.load(response)
    result = data.get('cpanelresult', {}) if api2 else data
    ok = result.get('event', {}).get('result') if api2 else result.get('status')
    if ok != 1:
        # Only documented API errors; explicitly redact all credential values.
        error = str(result.get('errors', result.get('error', 'API operation failed')))
        for value in (TOKEN, os.environ.get('CPANEL_FTP_PASSWORD','')):
            if value:
                error = error.replace(value, '[redacted]')
        raise RuntimeError(module+'/'+function+': '+error[:800])
    return result.get('data')

if __name__ == '__main__':
    domains = call('DomainInfo','list_domains')
    if domains['main_domain'] != 'm20mayorista.com':
        raise SystemExit('Unexpected cPanel account')
    print('Mail routing: '+json.dumps(call('Email','getmxcheck',api2=True,domain='m20mayorista.com')), flush=True)
    if 'forms.m20mayorista.com' not in domains['sub_domains']:
        result = call('SubDomain','addsubdomain',api2=True,domain='forms',rootdomain='m20mayorista.com',dir='/public_html/api/m20',disallowdot=1)
        if not result or result[0].get('result') != 1:
            raise SystemExit('Subdomain creation failed')
        print('Created forms.m20mayorista.com at public_html/api/m20.',flush=True)
    else:
        print('Forms host already exists.',flush=True)
    print('PHP configuration: '+json.dumps(call('LangPHP','php_get_vhost_versions')),flush=True)
    call('SSL','start_autossl_check')
    print('AutoSSL check requested.',flush=True)
