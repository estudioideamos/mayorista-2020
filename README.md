# Mayorista 2020

Sitio comercial responsive y estático, preparado para GitHub Pages. No requiere instalación de dependencias ni compilación.

## Previsualizar

Desde esta carpeta, ejecutar `python -m http.server 4173` y abrir `http://localhost:4173`.

También se puede abrir `index.html` directamente. La conexión a Internet permite cargar las fuentes de Google Fonts; hay tipografías de respaldo.

## Editar

- `index.html`: textos, sucursales, enlaces y selector de WhatsApp. Si cambia una sucursal, actualizar también su enlace en el selector.
- `styles.css`: identidad, tamaños, responsive y animaciones.
- `app.js`: menú, selector de WhatsApp y marquesinas.
- `assets/`: logo y fotografías suministrados por el cliente. Los archivos originales de la carpeta m20 no se modifican.

Identidad derivada del logo M20: azul #193e85, naranja #f45b19 y fondo #f8f9fa. Barlow Condensed para titulares y Manrope para lectura. Cortes diagonales e inclinación sutil inspirados en la marca.

Los contactos, horarios y direcciones corresponden al brief. No se publican precios, días de atención, promociones ni email no confirmados. Lácteos y congelados se presentan como categorías en incorporación.

## Publicación

GitHub Pages publica la rama `main`, carpeta raíz. Los enlaces y recursos usan rutas relativas para funcionar bajo el nombre del repositorio.

Logo de WhatsApp: archivo de WhatsApp/Meta, conservado sin modificar. Fuente: https://commons.wikimedia.org/wiki/File:WhatsApp_Logo_green.svg

## Contacto y novedades

- contacto.html y recursos-humanos.html: formularios atendidos por forms.js y enviar.php. Ver configuración del servidor al final.
- Dos marquesinas continuas con pausa y soporte para movimiento reducido.
- Instagram oficial revisado: https://www.instagram.com/mayorista2020__/. La biografía confirma venta mayorista y minorista. Canal de novedades publicado en el perfil: https://whatsapp.com/channel/0029Vb828km0lwglWOxds63C. Se conservan direcciones y Maps del brief. No se incorporan promociones ni precios no verificados.

- smooth-scroll.js: inercia para ruedita, multiplicador 0.55 y amortiguación de 160 ms. Mantiene controles, scroll interno, teclado y touch nativos; respeta movimiento reducido.


## Formularios en el servidor

Contacto y Recursos Humanos usan forms.js y enviar.php, sin servicios externos ni apertura de aplicaciones de correo. Cambiar destinatarios en el arreglo config de enviar.php: info@m20mayorista.com y rrhh@m20mayorista.com.

Para habilitar: subir el sitio completo al hosting con PHP 8+, fileinfo y mail() configurado por el proveedor. Configurar upload_max_filesize >= 5M y post_max_size >= 6M. El dominio debe permitir correo saliente y tener SPF/DKIM según el hosting. No hay credenciales en el proyecto.

En GitHub Pages y localhost los formularios se identifican como vista previa y no envían datos. En el hosting hay que comprobar recepción real de una consulta y un CV PDF antes de dar el envío por operativo. En este entorno no hay PHP instalado: aún no se verificó ejecución ni entrega del correo. La aceptación por mail() no confirma entrega en bandeja de entrada.

El endpoint valida campos y PDF de hasta 5 MB, usa remitente fijo y Reply-To del visitante, rechaza orígenes distintos, incluye campo anti-bots y limita intentos por IP a uno por minuto. No guarda CV ni mensajes permanentemente; los archivos temporales de subida los elimina PHP al terminar. Los registros de limitación contienen solamente una marca de tiempo y usan nombres con hash en la carpeta temporal del servidor.
