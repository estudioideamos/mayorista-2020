# Publicación en cPanel y formularios propios

## Despliegue estático

Pages sigue siendo el hosting público de m20mayorista.com. Su workflow no se modifica.
El workflow cpanel.yml se ejecuta en push a main o manualmente sobre main:
`npm ci` con Node 24, `npm run build`, `npm run check`, transferencia de dist/.
El build vacía dist antes de generarlo. El script limita los archivos permitidos.
Solo usa los cinco secrets CPANEL_HOST, CPANEL_PORT, CPANEL_USER,
CPANEL_SSH_KEY y CPANEL_SSH_PASSPHRASE. La clave se carga mediante ssh-agent
con askpass, sin argumentos ni logs que expongan secretos; se limpia al salir.
Las acciones están fijadas por commit. La concurrencia es independiente de Pages.

Destino fijo: /home3/m20adminpanel/public_html. Se comprueban ruta real,
permisos, rsync y sha256sum antes de transferir. No se usa --delete: permanecen
archivos de cPanel, .well-known, PHP y otros contenidos ajenos a dist/.
Esto también conserva assets obsoletos: su eliminación requiere revisión explícita.
Rsync retrasa el reemplazo hasta completar la transferencia; no es una publicación
atómica del sitio completo. Se verifica SHA-256 de cada archivo en el servidor.
Una ejecución fallida puede reintentarse desde Actions. Para volver a una versión,
revertir el cambio en main y dejar ejecutar ambos workflows.

La clave pública Ed25519 del servidor se observó por ssh-keyscan el 28/09/2026
y quedó fijada en scripts/cpanel-known-hosts (confianza inicial por primera conexión).
No se vuelve a aceptar automáticamente una clave distinta en cada ejecución.
Si el proveedor rota su clave, verificar el cambio con el hosting antes de actualizarla.

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
