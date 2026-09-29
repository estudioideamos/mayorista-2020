"""Deploy the separately tested PHP endpoint over verified FTPS."""
import ftplib
import hashlib
import io
import json
import os
from pathlib import Path
import secrets
import ssl
import time
import urllib.request
import uuid

HOST = os.environ['CPANEL_HOST']
USER = os.environ['CPANEL_USER']
assert HOST == 'buenosaires.servidoraweb.net' and USER == 'm20adminpanel'
context = ssl.create_default_context()
context.minimum_version = ssl.TLSVersion.TLSv1_2
with ftplib.FTP_TLS(context=context,timeout=45) as ftp:
    ftp.connect(HOST,9021)
    ftp.login(USER,os.environ['CPANEL_FTP_PASSWORD'])
    ftp.prot_p()
    ftp.cwd('/public_html')
    for part in ['api','m20']:
        try:
            ftp.cwd(part)
        except ftplib.error_perm:
            ftp.mkd(part)
            ftp.cwd(part)
    assert ftp.pwd() in ['/public_html/api/m20','/home3/m20adminpanel/public_html/api/m20']
    def upload(name, content):
        temporary = '.m20-'+uuid.uuid4().hex+('.php' if name.endswith('.php') else '')
        try:
            ftp.storbinary('STOR '+temporary,io.BytesIO(content))
            check=hashlib.sha256()
            ftp.retrbinary('RETR '+temporary,check.update)
            assert check.digest()==hashlib.sha256(content).digest()
            ftp.rename(temporary,name)
            check=hashlib.sha256()
            ftp.retrbinary('RETR '+name,check.update)
            assert check.digest()==hashlib.sha256(content).digest()
        except Exception:
            try:
                ftp.delete(temporary)
            except ftplib.all_errors:
                pass
            raise
    # Preserve hosting-generated PHP handlers and any unrelated settings.
    existing=io.BytesIO()
    try:
        ftp.retrbinary('RETR .htaccess',existing.write)
    except ftplib.error_perm as error:
        if not str(error).startswith('550'):
            raise
    old=existing.getvalue().decode('utf-8')
    start='# BEGIN M20 FORMS'
    end='# END M20 FORMS'
    if start in old:
        before, rest=old.split(start,1)
        _,after=rest.split(end,1)
        old=before+after
    rules=old.rstrip()+'\n'+start+'\n'+Path('backend/.htaccess').read_text()+end+'\n'
    upload('.htaccess',rules.encode())
    upload('.user.ini',Path('backend/.user.ini').read_bytes())
    upload('enviar.php',Path('enviar.php').read_bytes())
    print('Endpoint, security headers and scoped PHP limits uploaded and SHA-256 verified.',flush=True)
    # Temporary authenticated runtime inspection; always removed, no phpinfo exposure.
    key=secrets.token_hex(32)
    name='verify-'+uuid.uuid4().hex+'.php'
    digest=hashlib.sha256(key.encode()).hexdigest()
    php="<?php if (!hash_equals('"+digest+"',hash('sha256',$_SERVER['HTTP_X_M20_VERIFY']??''))) {http_response_code(404);exit;} header('Content-Type: application/json'); header('Cache-Control: no-store'); echo json_encode(['php'=>PHP_VERSION,'mail'=>function_exists('mail'),'fileinfo'=>class_exists('finfo'),'upload'=>ini_get('upload_max_filesize'),'post'=>ini_get('post_max_size'),'display_errors'=>ini_get('display_errors'),'opcache'=>function_exists('opcache_get_status') && opcache_get_status(false)!==false]);"
    upload(name,php.encode())
    try:
        result=None
        for attempt in range(12):
            try:
                req=urllib.request.Request('https://forms.m20mayorista.com/'+name,headers={'X-M20-Verify':key})
                with urllib.request.urlopen(req,timeout=15) as response:
                    result=json.load(response)
                break
            except Exception:
                if attempt==11:
                    raise SystemExit('HTTPS runtime check not ready. Retry once DNS and AutoSSL finish.')
                time.sleep(10)
        print('Runtime: '+json.dumps(result),flush=True)
        assert result['mail'] and result['fileinfo']
        assert result['display_errors'] in ('','0','Off')
        assert result['upload']=='5M' and result['post']=='6M', 'Unexpected PHP upload limits'
    finally:
        ftp.delete(name)
        print('Temporary runtime probe removed.',flush=True)
