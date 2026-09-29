"""Exercise PHP forms with a local mail sink; never sends external mail."""
import email
from email import policy
import hashlib
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.request
import urllib.error

ORIGIN = 'https://m20mayorista.com'
with tempfile.TemporaryDirectory(prefix='m20-forms-test-') as folder:
    root = Path(folder)
    shutil.copyfile('enviar.php', root / 'enviar.php')
    sink = root / 'sendmail.py'
    sink.write_text('#!/usr/bin/env python3\nimport os,sys\nfrom pathlib import Path\nif Path(os.environ["M20_TEST_MAIL"]+".fail").exists(): sys.exit(1)\nPath(os.environ["M20_TEST_MAIL"]).write_bytes(sys.stdin.buffer.read())\n')
    sink.chmod(0o700)
    mail = root / 'captured.eml'
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    process = subprocess.Popen(['php', '-d', 'sendmail_path='+str(sink), '-d', 'display_errors=0', '-S', f'127.0.0.1:{port}', '-t', str(root)], env={**os.environ, 'M20_TEST_MAIL':str(mail)}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    state_dir = Path(tempfile.gettempdir()) / ('m20-forms-' + hashlib.sha256(str(root).encode()).hexdigest())
    state_file = state_dir / 'state.json'
    def request(fields=None, origin=ORIGIN, method='POST', pdf=None):
        boundary = 'm20-test-boundary'
        body = b''
        for key, value in (fields or {}).items():
            body += f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode()
        if pdf is not None:
            body += f'--{boundary}\r\nContent-Disposition: form-data; name="cv"; filename="cv.pdf"\r\nContent-Type: application/pdf\r\n\r\n'.encode()+pdf+b'\r\n'
        body += f'--{boundary}--\r\n'.encode()
        headers = {'Content-Type':'multipart/form-data; boundary='+boundary, 'Access-Control-Request-Method':'POST'}
        if origin is not None:
            headers['Origin'] = origin
        req = urllib.request.Request(f'http://127.0.0.1:{port}/enviar.php', data=body if method=='POST' else None, headers=headers, method=method)
        try:
            response = urllib.request.urlopen(req)
        except urllib.error.HTTPError as error:
            response = error
        return response.status, response.headers, response.read()
    try:
        for attempt in range(30):
            try:
                with socket.create_connection(('127.0.0.1',port),timeout=.2):
                    break
            except OSError:
                time.sleep(.1)
        common = dict(name='Prueba automática', email='info@m20mayorista.com', website='', started_at=str(int(time.time())-10))
        contact = dict(common, kind='contact', branch='jcp1', format='Por unidad', message='Prueba local sin correo externo.')
        assert request(contact, origin='https://evil.example')[0] == 403
        assert request(contact, origin=None)[0] == 403
        code, headers, body = request(method='OPTIONS')
        assert code == 204 and headers['Access-Control-Allow-Origin'] == ORIGIN
        assert request(method='GET')[0] == 405
        assert request(dict(contact, website='bot'))[0] == 422
        assert request(dict(contact, started_at=str(int(time.time()))))[0] == 422
        assert request(dict(contact, email='a@example.com\r\nBcc: x@example.com'))[0] == 422
        assert request(dict(contact, kind='unknown'))[0] == 422
        code, headers, body = request(contact)
        assert code == 200 and json.loads(body)['ok'] is True
        assert headers['Access-Control-Allow-Origin'] == ORIGIN
        msg = email.message_from_bytes(mail.read_bytes(), policy=policy.default)
        assert msg['To'] == 'info@m20mayorista.com' and msg['Reply-To'] == 'info@m20mayorista.com'
        assert request(contact)[0] == 429
        saved = json.loads(state_file.read_text())
        saved['recent'] = {}
        state_file.write_text(json.dumps(saved))
        assert request(contact)[0] == 429, 'Duplicate payload must be blocked beyond the IP cooldown'
        assert request(dict(contact, message='Una consulta diferente y legitima.'))[0] == 200
        state_file.write_text('{corrupted')
        assert request(contact)[0] == 503, 'Corrupted rate state must fail closed'
        state_file.write_text(json.dumps({'hour':int(time.time()//3600),'count':100,'recent':{}}))
        assert request(contact)[0] == 429, 'Global hourly cap must be enforced'
        state_file.write_text(json.dumps({'hour':int(time.time()//3600),'count':1,'recent':{}}))
        careers = dict(common, kind='careers', phone='000', area='Prueba', profile='CV de prueba sin datos reales')
        assert request(careers, pdf=b'not a pdf')[0] == 422
        assert request(careers, pdf=b'%PDF-1.4\n'+b'x'*(5*1024*1024))[0] == 422
        code, _, body = request(careers, pdf=b'%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n')
        assert code == 200, (code, body)
        msg = email.message_from_bytes(mail.read_bytes(), policy=policy.default)
        assert msg['To'] == 'rrhh@m20mayorista.com'
        attachments = list(msg.iter_attachments())
        assert len(attachments) == 1 and attachments[0].get_filename() == 'curriculum.pdf'
        saved = json.loads(state_file.read_text())
        saved['recent'] = {}
        state_file.write_text(json.dumps(saved))
        fail_flag = Path(str(mail) + '.fail')
        fail_flag.touch()
        retry_contact = dict(contact, message='Consulta cuyo primer intento falla en el transporte.')
        assert request(retry_contact)[0] == 503
        fail_flag.unlink()
        saved = json.loads(state_file.read_text())
        saved['recent'] = {}
        state_file.write_text(json.dumps(saved))
        assert request(retry_contact)[0] == 200, 'Transport failure must release duplicate reservation'
        print('PHP forms: CORS, preflight, validation, honeypot, timing, cooldown, duplicate suppression, distinct messages, global cap, corrupted-state safety, recipients, PDF attachment and failed-mail retry passed.')
    finally:
        process.terminate()
        process.wait(timeout=5)
        shutil.rmtree(state_dir, ignore_errors=True)
