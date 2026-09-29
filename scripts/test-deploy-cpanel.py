"""Test transport retries without credentials or external connections."""
import contextlib
import importlib.util
import io
import ssl
from unittest.mock import MagicMock, patch

spec = importlib.util.spec_from_file_location('deploy', 'scripts/deploy-cpanel.py')
deploy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)
ftp = MagicMock()
ftp.__enter__.return_value = ftp
ftp.pwd.return_value = '/public_html'
config = {'CPANEL_HOST':'buenosaires.servidoraweb.net', 'CPANEL_USER':'m20adminpanel', 'CPANEL_FTP_PASSWORD':'test-value-only'}
with patch.dict(deploy.os.environ, config), patch.object(deploy, 'public_files', return_value=[]), patch.object(deploy.time, 'sleep'):
    output = io.StringIO()
    with patch.object(deploy.ftplib, 'FTP_TLS', side_effect=[ssl.SSLEOFError('interrupted'), ftp]) as connect, contextlib.redirect_stdout(output):
        deploy.main()
        assert connect.call_count == 2
    assert 'test-value-only' not in output.getvalue()
    with patch.object(deploy.ftplib, 'FTP_TLS', side_effect=ssl.SSLCertVerificationError('invalid certificate')) as connect, contextlib.redirect_stdout(io.StringIO()):
        try:
            deploy.main()
            raise AssertionError('Invalid TLS certificate must block deployment')
        except SystemExit as error:
            assert error.code == 1 and connect.call_count == 1
print('FTPS retry and certificate fail-closed checks passed; no network used.')
