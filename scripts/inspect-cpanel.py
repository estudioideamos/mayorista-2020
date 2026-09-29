"""Read-only, selected cPanel configuration; never print credentials or raw bodies."""
import base64
import json
import os
import urllib.request
import urllib.parse
import urllib.error

host = os.environ['CPANEL_HOST']
user = os.environ['CPANEL_USER']
assert host == 'buenosaires.servidoraweb.net' and user == 'm20adminpanel'
auth = base64.b64encode((user + ':' + os.environ['CPANEL_FTP_PASSWORD']).encode()).decode()

def api(module, function, **params):
    url = f'https://{host}:2083/execute/{module}/{function}?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={'Authorization': 'Basic ' + auth})
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.load(response)
        if data.get('status') != 1:
            print(module + '/' + function + ': API unavailable', flush=True)
            return None
        return data.get('data')
    except Exception as error:
        print(module + '/' + function + ': ' + type(error).__name__ + (' ' + str(error.code) if isinstance(error, urllib.error.HTTPError) else ''), flush=True)
        return None

for module, function, params in [
    ('DomainInfo', 'list_domains', {}),
    ('LangPHP', 'php_get_vhost_versions', {}),
    ('EmailAuth', 'validate_current_spfs', {'domain':'m20mayorista.com'}),
    ('EmailAuth', 'validate_current_dkims', {'domain':'m20mayorista.com'}),
    ('Email', 'list_pops', {'domain':'m20mayorista.com'}),
    ('SSL', 'installed_hosts', {}),
]:
    data = api(module, function, **params)
    if data is None:
        continue
    if module == 'Email':
        data = [{key: row.get(key) for key in ('email', 'suspended_incoming', 'suspended_login')} for row in data]
    elif module == 'SSL':
        data = [{key: row.get(key) for key in ('servername', 'domains', 'ip', 'documentroot')} for row in data]
    elif module == 'EmailAuth':
        data = [{key: row.get(key) for key in ('domain', 'state', 'status')} for row in data]
    print(module + '/' + function + ': ' + json.dumps(data), flush=True)
