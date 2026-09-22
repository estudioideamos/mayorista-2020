# Mayorista 2020

Sitio comercial responsive y estático, preparado para GitHub Pages. No requiere instalación de dependencias ni compilación.

## Previsualizar

Desde esta carpeta, ejecutar `python -m http.server 4173` y abrir `http://localhost:4173`.

También se puede abrir `index.html` directamente. La conexión a Internet permite cargar las fuentes de Google Fonts; hay tipografías de respaldo.

## Editar

- `index.html`: textos, sucursales, enlaces y selector de WhatsApp. Si cambia una sucursal, actualizar también su enlace en el selector.
- `styles.css`: identidad, tamaños, responsive y animaciones.
- `app.js`: menú móvil, diálogo accesible y animación de entrada.
- `assets/`: logo y fotografías suministrados por el cliente. Los archivos originales de la carpeta m20 no se modifican.

Identidad derivada del logo M20: azul #193e85, naranja #f45b19 y fondo #f8f9fa. Barlow Condensed para titulares y Manrope para lectura. Cortes diagonales e inclinación sutil inspirados en la marca.

Los contactos, horarios y direcciones corresponden al brief. No se publican precios, días de atención, promociones ni email no confirmados. Lácteos y congelados se presentan como categorías en incorporación.

## Publicación

GitHub Pages publica la rama `main`, carpeta raíz. Los enlaces y recursos usan rutas relativas para funcionar bajo el nombre del repositorio.

Logo de WhatsApp: archivo de WhatsApp/Meta, conservado sin modificar. Fuente: https://commons.wikimedia.org/wiki/File:WhatsApp_Logo_green.svg

## Contacto y novedades

- contacto.html y contacto.js: formulario validado con vista previa. Prepara WhatsApp para la sucursal elegida; no guarda datos ni envía automáticamente. El visitante confirma el envío en WhatsApp.
- Dos marquesinas continuas con pausa y soporte para movimiento reducido.
- Instagram oficial revisado: https://www.instagram.com/mayorista2020__/. La biografía confirma venta mayorista y minorista. Canal de novedades publicado en el perfil: https://whatsapp.com/channel/0029Vb828km0lwglWOxds63C. Se conservan direcciones y Maps del brief. No se incorporan promociones ni precios no verificados.

- smooth-scroll.js: inercia para ruedita, multiplicador 0.55 y amortiguación de 160 ms. Mantiene controles, scroll interno, teclado y touch nativos; respeta movimiento reducido.
