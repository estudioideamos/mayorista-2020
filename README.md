# Mayorista 2020

Sitio estático con Inicio, Contacto y Recursos Humanos. HTML semántico, CSS propio y JavaScript sin dependencias en el navegador. GitHub Pages es el hosting público de m20mayorista.com. Los formularios envían directamente a las casillas de M20 mediante https://forms.m20mayorista.com/enviar.php, alojado en cPanel.

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

## cPanel y formularios propios

El workflow separado `.github/workflows/cpanel.yml` construye y verifica `dist/` y lo copia por FTPS cifrado (puerto 9021) a cPanel en cada push a main. Pages sigue activo. Ver [despliegue y arquitectura de formularios](docs/cpanel-deployment.md).

### Formularios activos

Contacto → info@m20mayorista.com. Trabajá con nosotros → rrhh@m20mayorista.com, con CV PDF hasta 5 MB. Envío por el servidor local de M20, sin intermediarios. Reply-To usa el correo del visitante; remitente y envelope sender usan info@m20mayorista.com.

El workflow forms-deploy.yml prueba y despliega enviar.php y la configuración propia del backend en public_html/api/m20, separado de dist/ y de Pages. Las páginas permiten únicamente ese endpoint HTTPS en su CSP. El backend solo acepta los orígenes HTTPS de m20mayorista.com y www.m20mayorista.com.

Validaciones de campos, honeypot, tiempo mínimo, límite de un intento por IP/minuto y 100 por hora, comprobación de MIME/tamaño del PDF y cabeceras sin caché. PHP 8.3; límites efectivos: carga 5M, POST 6M y memoria 128M. Los errores se registran sin mostrarse al visitante. No se almacenan CV ni mensajes fuera de las casillas; solo contadores temporales.

El 29/09/2026 se confirmó la recepción real de ambas pruebas en INBOX, con Reply-To correcto y PDF adjunto en RR. HH. SPF y DKIM figuran válidos en cPanel; DMARC conserva p=none. La entrega local no incorpora firma DKIM, por lo que estas pruebas no certifican la entregabilidad a proveedores externos.

## SEO, IA y dominio

Las URLs canónicas actuales apuntan a https://estudioideamos.github.io/mayorista-2020/. Al migrar, actualizar canónicas, Open Graph, JSON-LD, sitemap.xml, robots.txt, llms.txt, 404.html y la URL base de scripts/check.mjs. Regenerar con build y volver a comprobar. No apuntar canónicas a un dominio que todavía no publica el sitio.

Datos estructurados: Organization, WebSite, WebPage/ContactPage, cuatro Store y breadcrumbs internos. No se publican precios, stock, vacantes, reseñas ni días de atención no confirmados. El horario de lunes a sábados es 08:00–16:00 hs. Los domingos abre únicamente Cuartel V, de 08:00 a 14:00 hs..

llms.txt resume información confirmada y enlaces oficiales; es complementario y no garantiza que una IA cite el sitio. El contenido principal está disponible sin JavaScript. Google no requiere archivos especiales para sus funciones de IA: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide

robots.txt solo rige cuando está en la raíz del dominio. En Pages bajo /mayorista-2020/, no controla los rastreadores del dominio estudioideamos.github.io; sitemap y metadatos sí siguen disponibles. Registrar el sitemap y verificar indexación en Search Console cuando el propietario tenga acceso.

## Portada social

assets/m20-social.jpg se usa en Open Graph y Twitter Cards. Original en design/social/m20-share-source.png; generado con la herramienta integrada de imágenes a partir del logo. Prompt y notas en docs/social-image.md. Las redes pueden conservar una vista previa anterior en caché.

Logo WhatsApp oficial conservado sin modificar. Fuentes Barlow Condensed y Manrope: licencias OFL en assets/fonts/.
