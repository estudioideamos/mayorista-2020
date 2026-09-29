"""Inspect selected spam settings using the existing cPanel API secret."""
import importlib.util
import json

spec = importlib.util.spec_from_file_location('cpanel', 'scripts/setup-forms.py')
cpanel = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cpanel)
try:
    domains = cpanel.call('DomainInfo', 'list_domains')
    assert domains['main_domain'] == 'm20mayorista.com' and not domains.get('addon_domains'), 'Unexpected account scope'
    for module, function in [('Email','get_spam_settings'), ('SpamAssassin','get_user_preferences')]:
        data = cpanel.call(module, function)
        print(module + '/' + function + ': ' + json.dumps(data), flush=True)
except Exception as error:
    print('Antispam inspection failed: ' + type(error).__name__, flush=True)
    raise SystemExit(1) from None
