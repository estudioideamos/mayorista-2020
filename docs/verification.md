# Verificación de optimización — 22/09/2026

## Entregado

- Fotos responsive WebP de 640 px y hasta 1200 px; dimensiones intrínsecas correctas y carga diferida fuera de portada.
- Cinco fotos originales: 1.958.175 bytes. Versiones grandes: 801.870 bytes (59% menos). Versiones pequeñas: 370.734 bytes (81% menos). El navegador elige según pantalla y densidad; esto no equivale a una medición de segundos de carga.
- Portada social JPEG: 1200 × 630, 93.975 bytes. Metadatos Open Graph y Twitter por página.
- Fuentes WOFF2 locales y licencia; Manrope variable compartida, sin cinco copias del mismo archivo.
- CSS legible y CSS publicado minificado. Retiradas 247 declaraciones reemplazadas, scripts de contacto obsoletos y cursor con punto.
- Efectos de puntero agrupados por frame y animaciones detenidas fuera de pantalla. Se respeta movimiento reducido.
- Canónicas, sitemap, resumen llms.txt, Organization, WebSite, cuatro Store y breadcrumbs; sin inventar stock, precios, vacantes o días.
- Publicación por lista de archivos permitidos. Sin PHP, originales ni herramientas en Pages.
- Política CSP en HTML; headers adicionales para Apache; datos de formularios enviados solo al mismo servidor.

## Comprobaciones

- npm audit: 0 vulnerabilidades conocidas en las dependencias instaladas (solo desarrollo).
- npm run check: metadatos, hashes CSP, JSON-LD, enlaces internos, imágenes, recursos CSS, tamaño de portada y sitemap.
- Sintaxis JavaScript y PHP comprobada.
- PHP probado contra SMTP local: GET rechazado, campos vacíos, email con saltos, origen externo, sucursal inválida, honeypot, límite por IP, PDF falso y envío válido de consulta/CV con destinatarios y adjunto correctos. No se envió correo externo.
- Revisión visual en navegador de escritorio y vista móvil. No se asigna un puntaje Lighthouse ni métricas Core Web Vitals sin una medición representativa.

## Pendiente del entorno final

- Subir PHP a un hosting mantenido; comprobar correo real, SPF/DKIM, TLS, escaneo de adjuntos y límites del servidor. Validar compatibilidad de .htaccess.
- Cambiar URLs canónicas y sitemap al dominio definitivo cuando publique el sitio. Registrar propiedad y sitemap en Search Console.
- Medir Core Web Vitals con tráfico real y velocidad desde conexiones móviles representativas.
- Ningún análisis garantiza ausencia total de vulnerabilidades o que los buscadores/IA indexen y citen el sitio.

Referencias técnicas: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data ; https://developers.google.com/search/docs/fundamentals/ai-optimization-guide ; https://www.php.net/manual/en/function.mail.php
