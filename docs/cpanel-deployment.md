# Publicación en cPanel y formularios propios

## Despliegue estático

Pages sigue siendo el hosting público de m20mayorista.com. Su workflow no se modifica.
El workflow cpanel.yml se ejecuta en push a main o manualmente sobre main:
`npm ci` con Node 24, `npm run build`, `npm run check`, transferencia de dist/.
El build vacía dist antes de generarlo. El script limita los archivos permitidos.
Usa CPANEL_HOST, CPANEL_USER y CPANEL_FTP_PASSWORD. Puerto FTPS explícito 9021,
indicado por el hosting para conexiones fuera de Argentina. Los secrets SSH se
conservan en GitHub pero este workflow no los utiliza. No se escriben credenciales
en archivos ni se imprimen respuestas del servidor que pudieran contenerlas.
Las acciones están fijadas por commit y la concurrencia es independiente de Pages.

Se exige TLS 1.2 o superior y certificado válido tanto al conectar como al transferir.
No existe fallback a FTP sin cifrado. El destino es /home3/m20adminpanel/public_html;
en cuentas FTP encerradas en su directorio personal corresponde a /public_html.
No se crea el directorio público si falta. No se borran archivos ajenos al despliegue.
Cada archivo se carga con nombre temporal, se descarga para verificar SHA-256 y
se renombra al nombre final; se vuelve a descargar y verificar después del renombrado.
Assets primero y HTML al final. No es una actualización atómica del sitio completo.
Los assets antiguos permanecen; cualquier limpieza requiere revisión explícita.

El cliente usa la biblioteca estándar de Python del runner Ubuntu. `python3
scripts/deploy-cpanel.py --check` valida el contenido público sin conectarse.
Una ejecución fallida se puede reintentar desde Actions. Para regresar a una versión,
revertir el cambio en main y dejar ejecutar ambos workflows.

El 28/09 el proveedor confirmó restricciones geográficas para SSH. Por eso se
reemplazó el transporte por FTPS; no se cambió DNS, correo ni hosting de Pages.

## Formularios: arquitectura pendiente de activación

El endpoint enviar.php existente dirige contact a info@m20mayorista.com y careers
a rrhh@m20mayorista.com. Usa mail() local, Reply-To del visitante, validación,
honeypot, límites por IP/global y PDF hasta 5 MB. El workflow estático excluye PHP
y .htaccess. No se considera habilitado el envío desde Pages: las acciones actuales
apuntan a enviar.php relativo, que Pages no ejecuta, incluso con dominio propio.

Para activarlos manteniendo Pages:

1. Confirmar una URL HTTPS propia que llegue a cPanel. forms.m20mayorista.com es
   una propuesta, no un subdominio configurado por este trabajo. Revisar primero
   DNS y certificado; no cambiar el dominio público ni MX.
2. Desplegar el endpoint por separado en el document root de ese host, manteniendo
   configuración privada fuera del directorio público. Verificar PHP mantenido,
   fileinfo, mail() y límites de carga del servidor.
3. Cambiar la comprobación actual de origen del PHP: permitir exclusivamente
   https://m20mayorista.com y https://www.m20mayorista.com con comparación exacta,
   responder OPTIONS y CORS con el origen permitido y Vary: Origin, nunca '*'.
   Revisar Sec-Fetch-Site junto con esta política, sin confiar en CORS como antispam.
4. Cambiar action en ambos formularios y connect-src/form-action en sus CSP a la
   URL confirmada; reconstruir y comprobar Pages. Preservar los límites del PHP.
5. Inspeccionar SPF, DKIM, DMARC y enrutamiento local/remoto en cPanel antes de
   proponer cambios. Confirmar el remitente autorizado y envelope sender; no
   inventar cuenta web@ ni credenciales SMTP.
6. Probar con autorización un mensaje de contacto y una postulación con PDF.
   Confirmar recepción en ambos buzones y revisar Authentication-Results de los
   mensajes. mail()=true solo significa aceptación local, no entrega ni bandeja.

No se cambian DNS, MX, SPF, DKIM, DMARC ni configuración de correo con este workflow.
