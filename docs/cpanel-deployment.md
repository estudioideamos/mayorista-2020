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

## Formularios activos y mantenimiento

Host: https://forms.m20mayorista.com, A 167.250.5.104, raíz /home3/m20adminpanel/public_html/api/m20. Certificado gestionado por AutoSSL. El dominio principal conserva GitHub Pages y fuerza HTTPS.

El workflow forms-deploy.yml ejecuta sintaxis PHP y pruebas con correo simulado antes de publicar el backend. Usa solo los secrets FTP y verifica SHA-256. La configuración PHP generada por cPanel se conserva en .htaccess. Una comprobación temporal autenticada verifica PHP, mail(), fileinfo, límites y errores; se elimina al terminar.

Destinatarios fijos: info@m20mayorista.com y rrhh@m20mayorista.com. Se confirmó la entrega de pruebas identificadas en INBOX el 29/09/2026, incluida la integridad del adjunto PDF. El workflow manual forms-verify.yml permite enviar nuevas pruebas (mode=send) o revisar pruebas recientes existentes (mode=existing). Lee solo mensajes candidatos recientes y no imprime contenido de correo ni contraseñas. Soporta Maildir comprimido.

CPANEL_API_TOKEN se usa solo para administración e inspección manual. No se necesita para los despliegues recurrentes; puede caducar al terminar esta configuración. La contraseña FTP sigue siendo necesaria para publicar.

Optimización de cPanel: caché de estáticos por 24 horas, HTML revalidado, compresión de texto, bloqueo de listados y cabeceras de seguridad. cpanel-optimize.yml preserva directivas existentes y guarda la configuración previa en /m20-config-backups fuera de public_html si existía. No se modifican archivos ajenos al sitio.

PHP efectivo en formularios: upload_max_filesize=5M, post_max_size=6M, memory_limit=128M, max_execution_time=30, max_input_time=60, max_input_vars=40; display_errors=Off y log_errors=On. OPcache no está activo en el hosting; no se cambió el motor global ni configuraciones de otras cuentas. El backend aplica además sus propios límites y política de origen.

Correo: casillas activas, enrutamiento local, SPF y DKIM validados por cPanel. DMARC conserva p=none. No se modificaron MX ni políticas de autenticación existentes. Las pruebas locales confirman llegada a estas dos casillas, no garantizan ausencia universal de spam.

Para revertir una versión del endpoint, revertir el commit correspondiente en main: el workflow vuelve a probar y desplegar. Para cambiar destinatarios, hacerlo en enviar.php, revisar las pruebas y validar recepción real. Nunca guardar credenciales en PHP, en dist ni en archivos del repositorio.
