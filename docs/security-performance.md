# Seguridad y rendimiento de M20

Revisión del 29 de septiembre de 2026, basada en [OWASP Top 10:2025](https://top10.owasp.org/2025/). Es una guía de riesgos, no una certificación ni una garantía de ausencia de vulnerabilidades.

## Controles aplicados

- A01 / A07: el sitio no tiene cuentas de visitantes ni sesiones. Los formularios tienen destinatarios fijos y no permiten elegir una dirección arbitraria. El acceso a cPanel y GitHub debe mantenerse bajo control del propietario.
- A02 / A04: HTTPS, FTPS con validación del certificado, secretos exclusivos de Actions, PHP con errores ocultos, respuestas sin caché, CSP y cabeceras del endpoint, directorios privados y listados desactivados. HSTS del endpoint no se extiende a otros subdominios.
- A03 / A08: dependencias actualizadas y fijadas en el lockfile, Actions fijadas a commits, permisos mínimos, instalación sin scripts de terceros, auditoría de dependencias antes de publicar y revisión semanal con Dependabot. Publicación de una lista limitada de archivos públicos y comprobación de integridad en cPanel.
- A05 / A06: validación del lado del servidor, límites de campos, remitente fijo, rechazo de saltos de línea en el email, respuestas JSON y texto sin HTML del visitante. Los PDF se verifican por extensión, MIME y tamaño máximo de 5 MB; no se guardan como archivos públicos ejecutables.
- A06: honeypot, tiempo mínimo, un envío por IP cada minuto y máximo global de 100 por hora. CORS limita el uso desde navegadores, pero no autentica bots ni sustituye estos controles.
- A09 / A10: eventos operativos sin datos de los visitantes, errores genéricos, límite de envíos con almacenamiento acotado y bloqueo ante corrupción o imposibilidad de persistir el estado. Pruebas automáticas de validación, abuso, adjuntos y manejo de fallos.

## Alcance y mantenimiento

GitHub Pages sigue siendo el hosting público. El endpoint PHP vive en forms.m20mayorista.com, en cPanel. No se modificaron MX, SPF, DKIM ni DMARC en esta revisión. La configuración de servidor compartido y las actualizaciones del sistema/PHP dependen del proveedor; no se afirma haber actualizado su sistema operativo.

GitHub Pages no permite personalizar todas las cabeceras HTTP mediante .htaccess: las reglas de cPanel solo rigen allí. La CSP del sitio está en el HTML y la del endpoint en sus cabeceras. Los logs operativos no equivalen a un servicio de alertas o vigilancia permanente. No hay análisis antivirus de los PDF; validar tipo/tamaño no garantiza que un documento sea inocuo. Esto no reemplaza un pentest integral.

## Rendimiento

Fotografías con AVIF y alternativas WebP, tamaños responsivos intermedios, fuentes locales integradas en la hoja principal y ajuste de contraste del título de productos. Se mantienen las animaciones y el diseño. URLs canónicas y sitemap actualizados al dominio público.

Medición inicial Lighthouse local: móvil 67 en rendimiento, accesibilidad 96, buenas prácticas 100 y SEO 100. La primera ejecución etiquetada como escritorio utilizó por error emulación móvil: ese valor se descartó y no sirve como comparación de escritorio. Los resultados de laboratorio varían entre ejecuciones y no son métricas de todos los visitantes.

## Verificación de cierre

Las pruebas automatizadas de seguridad y construcción pasaron. Se verificaron los formularios en navegador a 390 y 1366 px y la recepción real en INBOX de info y rrhh, incluido el PDF. El endpoint publica las cabeceras previstas y PHP mantiene upload=5M, post=6M y display_errors=0.

La copia por FTPS incorpora hasta tres intentos con reconexión ante cortes temporales; mantiene la validación TLS y nunca cambia a FTP sin cifrar. Se probaron la recuperación por interrupción de conexión y el rechazo de certificados inválidos.

Las mediciones Lighthouse posteriores variaron entre 41 y 84 en móvil; escritorio con el perfil corregido dio 83. Accesibilidad, buenas prácticas y SEO dieron 100. Esa variación no permite afirmar una mejora sostenida de puntuación móvil; quedan como evidencia de laboratorio, no como garantía de velocidad. Sí se comprobó la carga de imágenes AVIF, sin imágenes rotas, desbordamiento horizontal ni errores JavaScript. La compresión y los tamaños responsivos reducen el peso de las fotografías; los efectos visuales siguen activos.
