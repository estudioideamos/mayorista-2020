import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import postcss from "postcss";
import cssnano from "cssnano";

// Keep CSP and cache digests identical on Windows and Linux, including Pages.
for (const source of ["index.html", "contacto.html", "recursos-humanos.html", "404.html", "app.js", "premium.js", "smooth-scroll.js", "forms.js"]) {
  const original = await fs.readFile(source, "utf8");
  const normalized = original.replace(/\r\n/g, "\n");
  if (original !== normalized) await fs.writeFile(source, normalized);
}

// Bake the existing sRGB SVG alpha matrix into the header artwork once,
// instead of asking each browser to filter a large bitmap during every paint.
const logo = await sharp("assets/logo-original.png").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < logo.data.length; i += 4) {
  logo.data[i + 3] = Math.round(Math.max(0, Math.min(255,
    2.8 * 255 - logo.data[i] - logo.data[i + 1] - logo.data[i + 2])));
}
await sharp(logo.data, { raw: logo.info }).webp({ lossless: true }).toFile("assets/logo-transparent.webp");
await sharp("assets/logo-original.png").webp({ lossless: true }).toFile("assets/logo-original.webp");

// Originals stay in design/; only optimized assets are published.
for (const name of [
  "interior",
  "jcp-1",
  "jcp-esquina",
  "moreno",
  "pilar",
  "portada",
  "repositor",
  "salon",
]) {
  for (const width of [480, 640, 768, 900, 1200]) {
    await sharp(`design/photos/${name}.jpg`)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 78, effort: 6 })
      .toFile(`assets/${name}-${width}.webp`);
    await sharp(`design/photos/${name}.jpg`)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .avif({ quality: 50, effort: 4 })
      .toFile(`assets/${name}-${width}.avif`);
  }
}
await sharp("design/social/m20-share-source.png")
  .resize(1200, 630, { fit: "contain", background: "#102d67" })
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile("assets/m20-social.jpg");
const fontCss = (await fs.readFile("assets/fonts.css", "utf8")).replace(/url\((["']?)fonts\//g, "url($1assets/fonts/");
const css = fontCss + "\n" + await fs.readFile("styles.css", "utf8");
const result = await postcss([cssnano({ preset: "default" })]).process(css, {
  from: "styles.css",
  to: "styles.min.css",
  map: false,
});
await fs.writeFile("styles.min.css", result.css);
console.log(
  `CSS: ${Buffer.byteLength(css)} → ${Buffer.byteLength(result.css)} bytes`,
);
const digest = (value) =>
  createHash("sha256").update(value).digest("hex").slice(0, 12);
const dimensions = {};
for (const name of [
  "interior",
  "jcp-1",
  "jcp-esquina",
  "moreno",
  "pilar",
  "portada",
  "repositor",
  "salon",
]) {
  dimensions[name] = await sharp(`assets/${name}-1200.webp`).metadata();
}
for (const file of [
  "index.html",
  "contacto.html",
  "recursos-humanos.html",
  "404.html",
]) {
  let html = await fs.readFile(file, "utf8");
  html = html.replace(/<picture class="optimized-picture"><source[^>]*>(<img\b[^>]*>)<\/picture>/g, "$1");
  html = html.replace(/<link rel="stylesheet" href="assets\/fonts\.css\?v=1" \/>\s*/g, "");
  // This small static site ships its minified stylesheet with the document,
  // removing a render-blocking round trip without deferred-style flashes.
  html = html.replace(/<style data-site-styles>[\s\S]*?<\/style>/g, '<link rel="stylesheet" href="styles.min.css?v=build" />');
  html = html.replace(/<link rel="stylesheet" href="styles\.min\.css\?v=[\w]+" \/>/g, () => `<style data-site-styles>${result.css}</style>`);
  html = html.replace(/<img\b[^>]*>/g, (tag) => {
    const name = tag.match(/src="assets\/([^"/]+)-1200\.webp"/)?.[1];
    if (!dimensions[name]) return tag;
    const { width, height } = dimensions[name];
    const candidates = [...new Set([480, 640, 768, 900, 1200].map(size => Math.min(size, width)))];
    const srcset = (format) => candidates.map((actual) => {
      const nominal = [480, 640, 768, 900, 1200].find(size => size >= actual);
      return `assets/${name}-${nominal}.${format} ${actual}w`;
    }).join(", ");
    const sizes = tag.match(/sizes="([^"]*)"/)?.[1] || "100vw";
    const img = tag
      .replace(/width="\d+"/, `width="${width}"`)
      .replace(/height="\d+"/, `height="${height}"`)
      .replace(/srcset="[^"]*"/, `srcset="${srcset("webp")}"`);
    return `<picture class="optimized-picture"><source type="image/avif" srcset="${srcset("avif")}" sizes="${sizes}">${img}</picture>`;
  });
  html = html.replace(
    /styles\.min\.css\?v=[\w]+/g,
    `styles.min.css?v=${digest(result.css)}`,
  );
  for (const script of [
    "app.js",
    "premium.js",
    "smooth-scroll.js",
    "forms.js",
  ]) {
    const hash = digest(await fs.readFile(script));
    html = html.replace(
      new RegExp(script.replace(".", "\\.") + "\\?v=[\\w]+", "g"),
      `${script}?v=${hash}`,
    );
  }
  const schema = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  );
  if (schema) {
    const hash = createHash("sha256").update(schema[1]).digest("base64");
    html = html.replace(/'sha256-[^']+'/g, `'sha256-${hash}'`);
  }
  await fs.writeFile(file, html);
}

// The deployment folder deliberately excludes PHP, originals and development tools.
await fs.rm("dist", { recursive: true, force: true });
await fs.mkdir("dist", { recursive: true });
for (const name of [
  "index.html",
  "contacto.html",
  "recursos-humanos.html",
  "404.html",
  "favicon.svg",
  "robots.txt",
  "sitemap.xml",
  "llms.txt",
  "styles.min.css",
  "app.js",
  "premium.js",
  "smooth-scroll.js",
  "forms.js",
  ".nojekyll",
]) {
  await fs.copyFile(name, path.join("dist", name));
}
await fs.cp("assets", "dist/assets", { recursive: true });
console.log(
  "Static deployment ready in dist/. PHP is distributed separately for the final hosting.",
);
