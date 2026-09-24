# Mayorista 2020

Sitio estático con Inicio, Contacto y Recursos Humanos. HTML semántico, CSS propio y JavaScript sin dependencias en el navegador. Los formularios requieren un hosting PHP para enviar; GitHub Pages es una vista previa.

## Desarrollo

Requiere Node.js 24 LTS y npm. Las versiones exactas de las herramientas están en package-lock.json.

```sh
npm ci
npm run format
npm run build
npm run check
npm audit
```

Servir la carpeta raíz con un servidor HTTP local para previsualizar. No usar el PHP de producción para pruebas de envío sin un buzón o SMTP de prueba.

- HTML: contenido, metadatos, enlaces y JSON-LD de cada página.
- styles.css: estilos editables. styles.min.css: generado; no editar manualmente.
- app.js: navegación, selector de sucursal y marquesinas.
- premium.js: cabecera, botón de subir, columnas fijas y efectos.
- smooth-scroll.js: inercia de la rueda; mantiene touch y controles nativos.
- forms.js y enviar.php: validación y envío en el hosting final.
- design/: originales de fotografías y portada social, necesarios para regenerar assets. No se publican en Pages.
- assets/: imágenes WebP responsive, portada JPEG 1200 × 630, SVG y fuentes WOFF2 locales con licencias.
- scripts/: build y comprobaciones de integridad.
- dist/: salida local ignorada por Git. Contiene solo archivos públicos estáticos.

## Publicación

GitHub Actions publica únicamente la lista de archivos públicos definida en .github/workflows/pages.yml. PHP, fuentes de diseño, documentación, scripts de desarrollo y node_modules quedan fuera. Las acciones se fijan a revisiones exactas; Dependabot propone actualizaciones sin fusionarlas automáticamente.

Después de editar, ejecutar format → build → check y confirmar tanto fuentes como assets generados. El build actualiza hashes de caché y la política CSP del JSON-LD.

## Hosting definitivo y formularios

Subir el contenido de dist/ más enviar.php y .htaccess a un hosting con una versión de PHP mantenida, extensión fileinfo y mail() configurado. Destinatarios en el inicio de enviar.php: Contacto info@m20mayorista.com; RR. HH. rrhh@m20mayorista.com. No hay contraseñas ni secretos en el repositorio.

Configurar upload_max_filesize >= 5M y post_max_size >= 6M, HTTPS, SPF/DKIM y limitación de solicitudes en el hosting. Apache debe permitir las directivas de .htaccess; con Nginx el proveedor debe trasladar las cabeceras y caché a su configuración. No subir el repositorio entero ni la carpeta .git.

Los formularios rechazan origen externo, cabeceras inyectadas, campos inválidos y archivos no PDF. Límite: un intento por IP por minuto y 100 intentos globales por hora. Solo se guardan contadores temporales, no mensajes ni CV. El archivo se adjunta como curriculum.pdf. La validación MIME no equivale a un antivirus: el servidor/buzón debe escanear adjuntos. No abrir archivos sospechosos. El hosting debe mantener PHP y el servidor actualizados.

Se probaron ambos flujos contra un SMTP local sin enviar correo externo. Que mail() acepte un mensaje no garantiza recepción. Comprobar una consulta y un CV reales después del despliegue. Pages no ejecuta PHP y avisa que el envío no está habilitado.

## SEO, IA y dominio

Las URLs canónicas actuales apuntan a https://estudioideamos.github.io/mayorista-2020/. Al migrar, actualizar canónicas, Open Graph, JSON-LD, sitemap.xml, robots.txt, llms.txt, 404.html y la URL base de scripts/check.mjs. Regenerar con build y volver a comprobar. No apuntar canónicas a un dominio que todavía no publica el sitio.

Datos estructurados: Organization, WebSite, WebPage/ContactPage, cuatro Store y breadcrumbs internos. No se publican precios, stock, vacantes, reseñas ni días de atención no confirmados. El horario habitual es 08:00–16:00 hs. Los domingos abre únicamente Cuartel V, de 08:00 a 14:00 hs.; los demás días no se detallan sin confirmación.

llms.txt resume información confirmada y enlaces oficiales; es complementario y no garantiza que una IA cite el sitio. El contenido principal está disponible sin JavaScript. Google no requiere archivos especiales para sus funciones de IA: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide

robots.txt solo rige cuando está en la raíz del dominio. En Pages bajo /mayorista-2020/, no controla los rastreadores del dominio estudioideamos.github.io; sitemap y metadatos sí siguen disponibles. Registrar el sitemap y verificar indexación en Search Console cuando el propietario tenga acceso.

## Portada social

assets/m20-social.jpg se usa en Open Graph y Twitter Cards. Original en design/social/m20-share-source.png; generado con la herramienta integrada de imágenes a partir del logo. Prompt y notas en docs/social-image.md. Las redes pueden conservar una vista previa anterior en caché.

Logo WhatsApp oficial conservado sin modificar. Fuentes Barlow Condensed y Manrope: licencias OFL en assets/fonts/.
