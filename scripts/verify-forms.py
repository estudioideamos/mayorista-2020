"""Send two labelled form tests and verify only their messages in the mailboxes."""
import email
from email import policy
import ftplib
import io
import json
import os
import ssl
import time
import urllib.request
import uuid

marker='M20-TEST-'+uuid.uuid4().hex
started=time.time()
ORIGIN='https://m20mayorista.com'

def send(kind):
    boundary=uuid.uuid4().hex
    fields=dict(kind=kind,name='Prueba técnica M20',email='info@m20mayorista.com',website='',started_at=str(int(time.time())-10))
    if kind=='contact':
        fields.update(branch='jcp1',format='Quiero consultar',message=marker+' Contacto. Prueba autorizada de funcionamiento; no requiere respuesta.')
    else:
        fields.update(phone='0000000000',area='Prueba técnica',profile=marker+' RRHH. Prueba autorizada; el PDF no contiene una postulación real.')
    body=b''
    for key,value in fields.items():
        body+=f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode()
    if kind=='careers':
        stream=b'BT /F1 18 Tf 30 100 Td (Prueba tecnica M20 - sin datos personales) Tj ET'
        objects=[b'<< /Type /Catalog /Pages 2 0 R >>',b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',b'<< /Length '+str(len(stream)).encode()+b' >>\nstream\n'+stream+b'\nendstream']
        pdf=b'%PDF-1.4\n'; offsets=[0]
        for index,obj in enumerate(objects,1):
            offsets.append(len(pdf));pdf+=f'{index} 0 obj\n'.encode()+obj+b'\nendobj\n'
        xref=len(pdf);pdf+=b'xref\n0 6\n0000000000 65535 f \n'+b''.join(f'{offset:010d} 00000 n \n'.encode() for offset in offsets[1:])+f'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode()
        body+=f'--{boundary}\r\nContent-Disposition: form-data; name="cv"; filename="prueba-tecnica.pdf"\r\nContent-Type: application/pdf\r\n\r\n'.encode()+pdf+b'\r\n'
    body+=f'--{boundary}--\r\n'.encode()
    req=urllib.request.Request('https://forms.m20mayorista.com/enviar.php',data=body,headers={'Origin':ORIGIN,'Content-Type':'multipart/form-data; boundary='+boundary})
    with urllib.request.urlopen(req,timeout=45) as response:
        result=json.load(response)
        assert response.headers['Access-Control-Allow-Origin']==ORIGIN
        assert result['ok'] is True
    print(kind+': HTTP 200, mail accepted.',flush=True)

send('contact')
print('Waiting for the deliberate per-IP cooldown before the CV test.',flush=True)
time.sleep(62)
send('careers')
with ftplib.FTP_TLS(context=ssl.create_default_context(),timeout=45) as ftp:
    ftp.connect(os.environ['CPANEL_HOST'],9021)
    ftp.login(os.environ['CPANEL_USER'],os.environ['CPANEL_FTP_PASSWORD'])
    ftp.prot_p()
    found=set()
    for attempt in range(6):
        for mailbox in ['info','rrhh']:
            if mailbox in found:
                continue
            for folder in ['new','cur','.Junk/new','.Junk/cur','.spam/new','.spam/cur']:
                try:
                    ftp.cwd('/mail/m20mayorista.com/'+mailbox+'/'+folder)
                    entries=list(ftp.mlsd(facts=['type','modify']))
                except ftplib.error_perm:
                    continue
                cutoff=time.strftime('%Y%m%d%H%M%S',time.gmtime(started-30))
                for name,facts in entries:
                    if facts.get('type')!='file' or facts.get('modify','') < cutoff:
                        continue
                    data=io.BytesIO();ftp.retrbinary('RETR '+name,data.write)
                    msg=email.message_from_bytes(data.getvalue(),policy=policy.default)
                    text=''.join(part.get_content() for part in msg.walk() if part.get_content_type()=='text/plain')
                    if marker not in text:
                        continue
                    attachments=list(msg.iter_attachments())
                    if mailbox=='rrhh':
                        assert len(attachments)==1 and attachments[0].get_content_type()=='application/pdf'
                    assert msg['Reply-To']=='info@m20mayorista.com'
                    assert not folder.startswith('.'), 'Test delivered to spam folder'
                    print(mailbox+': test received in INBOX; Reply-To verified; PDF='+str(bool(attachments))+'; DKIM signature='+str(bool(msg['DKIM-Signature'])),flush=True)
                    found.add(mailbox)
                    break
                if mailbox in found:
                    break
        if len(found)==2:
            break
        time.sleep(10)
    assert found=={'info','rrhh'}, 'Test delivery not confirmed in both mailboxes'
print('Both production forms delivered to their destination inboxes.',flush=True)
