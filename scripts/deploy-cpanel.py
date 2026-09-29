"""Deploy only generated public files via explicit FTPS; never log credentials."""
import ftplib
import hashlib
import os
from pathlib import Path
import re
import ssl
import sys
import uuid

PUBLIC = set('index.html contacto.html recursos-humanos.html 404.html favicon.svg robots.txt sitemap.xml llms.txt styles.min.css app.js premium.js smooth-scroll.js forms.js .nojekyll'.split())


def public_files(root):
    files = []
    if root.is_symlink():
        raise ValueError('dist must not be a symbolic link')
    for file in root.rglob('*'):
        if file.is_symlink():
            raise ValueError('Symbolic link in public output')
        if not file.is_file():
            continue
        name = file.relative_to(root).as_posix()
        asset = name.startswith('assets/') and (file.suffix in {'.webp', '.jpg', '.png', '.svg', '.woff2', '.css'} or re.fullmatch(r'OFL(?:-[A-Za-z]+)?\.txt', file.name))
        if not re.fullmatch(r'[A-Za-z0-9_./-]+', name) or any(part.startswith('.') for part in name.split('/') if part != '.nojekyll') or (name not in PUBLIC and not asset):
            raise ValueError('Unexpected file in public output')
        files.append((name, file))
    if not PUBLIC.issubset({name for name, _ in files}):
        raise ValueError('Incomplete public output')
    if not (root / 'index.html').stat().st_size:
        raise ValueError('Empty index')
    # Assets/scripts first; HTML last. Each replacement is atomic, not the whole site.
    return sorted(files, key=lambda item: (item[0].endswith('.html'), item[0]))


def main():
    files = public_files(Path('dist'))
    if '--check' in sys.argv:
        print(f'Public output validated: {len(files)} files')
        return
    host = os.environ.get('CPANEL_HOST', '')
    user = os.environ.get('CPANEL_USER', '')
    password = os.environ.get('CPANEL_FTP_PASSWORD', '')
    if host != 'buenosaires.servidoraweb.net' or user != 'm20adminpanel' or not password:
        raise ValueError('Missing or unexpected deployment configuration')
    context = ssl.create_default_context()
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    stage = 'connecting to FTPS port 9021'
    try:
        with ftplib.FTP_TLS(context=context, timeout=45) as ftp:
            ftp.connect(host, 9021)
            ftp.auth()
            stage = 'authenticating FTP account'
            ftp.login(user, password)
            ftp.prot_p()  # Encrypt data as well as credentials. Never fall back to FTP.
            ftp.set_pasv(True)
            stage = 'locating public_html'
            try:
                ftp.cwd('/home3/m20adminpanel/public_html')
            except ftplib.error_perm:
                # cPanel FTP chroots the main account to its home directory.
                ftp.cwd('/public_html')
            base = ftp.pwd()
            if base not in {'/public_html', '/home3/m20adminpanel/public_html'}:
                raise ValueError('Unexpected FTP target directory')
            print('FTPS authenticated; public_html selected; TLS certificate verified.', flush=True)
            for name, file in files:
                stage = f'uploading {name}'
                ftp.cwd(base)
                for part in name.split('/')[:-1]:
                    try:
                        ftp.cwd(part)
                    except ftplib.error_perm:
                        ftp.mkd(part)
                        ftp.cwd(part)
                temporary = '.m20-deploy-' + uuid.uuid4().hex
                try:
                    with file.open('rb') as data:
                        ftp.storbinary('STOR ' + temporary, data)
                    remote_hash = hashlib.sha256()
                    ftp.retrbinary('RETR ' + temporary, remote_hash.update)
                    if remote_hash.digest() != hashlib.sha256(file.read_bytes()).digest():
                        raise ValueError('Uploaded file checksum mismatch')
                    ftp.rename(temporary, file.name)
                    published_hash = hashlib.sha256()
                    ftp.retrbinary('RETR ' + file.name, published_hash.update)
                    if published_hash.digest() != remote_hash.digest():
                        raise ValueError('Published file checksum mismatch')
                except Exception:
                    try:
                        ftp.delete(temporary)
                    except ftplib.all_errors:
                        pass
                    raise
            print(f'All {len(files)} public files deployed and read back with matching SHA-256.')
    except Exception as error:
        # Do not print raw server responses, exceptions or credential values.
        code = str(error)[:3] if isinstance(error, ftplib.Error) and str(error)[:3].isdigit() else type(error).__name__
        print(f'::error::FTPS failed while {stage} ({code}).', flush=True)
        raise SystemExit(1) from None


if __name__ == '__main__':
    main()
