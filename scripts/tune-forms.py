"""Inspect mailbox layout without printing message content, and apply scoped PHP limits."""
import ftplib
import importlib.util
import json
import os
import ssl
from pathlib import Path
spec=importlib.util.spec_from_file_location('setup','scripts/setup-forms.py')
setup=importlib.util.module_from_spec(spec);spec.loader.exec_module(setup)
values={'upload_max_filesize':'5M','post_max_size':'6M','memory_limit':'128M','max_execution_time':'30','max_input_time':'60','max_input_vars':'40','display_errors':'Off','log_errors':'On'}
for key,value in values.items():
    setup.call('LangPHP','php_ini_set_user_basic_directives',type='vhost',vhost='forms.m20mayorista.com',directive=key+':'+value)
print('Scoped PHP limits applied.',flush=True)
result=setup.call('LangPHP','php_ini_get_user_basic_directives',type='vhost',vhost='forms.m20mayorista.com')
print('PHP limits: '+json.dumps({row['key']:row['value'] for row in result['directives'] if row['key'] in values}),flush=True)
with ftplib.FTP_TLS(context=ssl.create_default_context(),timeout=30) as ftp:
    ftp.connect(os.environ['CPANEL_HOST'],9021)
    ftp.login(os.environ['CPANEL_USER'],os.environ['CPANEL_FTP_PASSWORD']);ftp.prot_p()
    for path in ['/mail','/mail/m20mayorista.com','/mail/m20mayorista.com/info','/mail/m20mayorista.com/rrhh']:
        try:
            ftp.cwd(path)
            entries=list(ftp.mlsd(facts=['type','modify']))
            print(path+': directories='+json.dumps([n for n,f in entries if f.get('type')=='dir'])+'; file_count='+str(sum(f.get('type')=='file' for _,f in entries)),flush=True)
        except ftplib.error_perm as error:
            print(path+': FTP '+str(error)[:3],flush=True)
    for box in ['info','rrhh']:
        for folder in ['new','cur']:
            try:
                ftp.cwd('/mail/m20mayorista.com/'+box+'/'+folder)
                entries=[f for n,f in ftp.mlsd(facts=['type','modify']) if f.get('type')=='file']
                print(box+'/'+folder+': count='+str(len(entries))+'; latest_modify='+max([f.get('modify','') for f in entries],default='none'),flush=True)
            except ftplib.error_perm as error:
                print(box+'/'+folder+': FTP '+str(error)[:3],flush=True)

    import email
    from email import policy
    import io
    import re
    for box in ['info','rrhh']:
        ftp.cwd('/mail/m20mayorista.com/'+box+'/new')
        for name,facts in ftp.mlsd(facts=['type','modify']):
            if facts.get('type')!='file' or facts.get('modify','')<'20260929121300':
                continue
            data=io.BytesIO();ftp.retrbinary('RETR '+name,data.write)
            msg=email.message_from_bytes(data.getvalue(),policy=policy.default)
            subject=str(msg['Subject'])
            if not any(word in subject.lower() for word in ['consulta web','postulación laboral','mail delivery','undelivered']):
                continue
            parts=[p for p in msg.walk() if p.get_content_type()=='text/plain']
            text=''.join(p.get_content() for p in parts)
            print(box+': diagnostic subject='+subject+'; mime='+str(msg.get_content_type())+'; text_parts='+str(len(parts))+'; marker='+str(bool(re.search(r'M20-TEST-[a-f0-9]+',text)))+'; attachments='+str(len(list(msg.iter_attachments()))),flush=True)
            if 'delivery' in subject.lower() or 'undelivered' in subject.lower():
                for line in text.splitlines():
                    if any(word in line.lower() for word in ['smtp error','550 ','554 ','not permitted','not allowed','rejected','mailbox is full']):
                        print('Delivery diagnostic: '+line[:250],flush=True)
