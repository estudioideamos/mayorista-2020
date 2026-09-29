"""Preserve existing cPanel directives while adding static caching and compression."""
import ftplib
import hashlib
import io
import os
from pathlib import Path
import ssl
import uuid

host=os.environ['CPANEL_HOST'];user=os.environ['CPANEL_USER']
assert host=='buenosaires.servidoraweb.net' and user=='m20adminpanel'
with ftplib.FTP_TLS(context=ssl.create_default_context(),timeout=45) as ftp:
    ftp.connect(host,9021);ftp.login(user,os.environ['CPANEL_FTP_PASSWORD']);ftp.prot_p()
    ftp.cwd('/public_html')
    data=io.BytesIO()
    try:
        ftp.retrbinary('RETR .htaccess',data.write)
    except ftplib.error_perm as error:
        if not str(error).startswith('550'):
            raise
    original=data.getvalue()
    if original:
        ftp.cwd('/')
        try:
            ftp.cwd('m20-config-backups')
        except ftplib.error_perm:
            ftp.mkd('m20-config-backups');ftp.cwd('m20-config-backups')
        ftp.storbinary('STOR htaccess-'+uuid.uuid4().hex,io.BytesIO(original))
        ftp.cwd('/public_html')
    text=original.decode('utf-8')
    start='# BEGIN M20 STATIC OPTIMIZATION';end='# END M20 STATIC OPTIMIZATION'
    if start in text:
        before,rest=text.split(start,1);_,after=rest.split(end,1);text=before+after
    managed=Path('.htaccess').read_text(encoding='utf-8').replace('max-age=604800','max-age=86400')
    content=(text.rstrip()+'\n'+start+'\n'+managed+'\n'+end+'\n').encode()
    temp='.m20-config-'+uuid.uuid4().hex
    ftp.storbinary('STOR '+temp,io.BytesIO(content))
    check=hashlib.sha256();ftp.retrbinary('RETR '+temp,check.update)
    assert check.digest()==hashlib.sha256(content).digest()
    ftp.rename(temp,'.htaccess')
    published=hashlib.sha256();ftp.retrbinary('RETR .htaccess',published.update)
    assert published.digest()==hashlib.sha256(content).digest()
    print('Static cache, text compression, directory-listing protection and security headers configured; existing directives preserved.',flush=True)
