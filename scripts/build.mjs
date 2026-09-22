import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import postcss from "postcss";
import cssnano from "cssnano";

// Originals stay in design/; only optimized assets are published.
for (const name of ["interior", "jcp-1", "jcp-esquina", "moreno", "pilar"]) {
  for (const width of [640, 1200]) {
    await sharp(`design/photos/${name}.jpg`)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 78, effort: 6 })
      .toFile(`assets/${name}-${width}.webp`);
  }
}
await sharp("design/social/m20-share-source.png")
  .resize(1200, 630, { fit: "contain", background: "#102d67" })
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile("assets/m20-social.jpg");
const css = await fs.readFile("styles.css", "utf8");
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
for (const name of ["interior", "jcp-1", "jcp-esquina", "moreno", "pilar"]) {
  dimensions[name] = await sharp(`assets/${name}-1200.webp`).metadata();
}
for (const file of [
  "index.html",
  "contacto.html",
  "recursos-humanos.html",
  "404.html",
]) {
  let html = await fs.readFile(file, "utf8");
  html = html.replace(/<img\b[^>]*>/g, (tag) => {
    const name = tag.match(/src="assets\/([^"/]+)-1200\.webp"/)?.[1];
    if (!dimensions[name]) return tag;
    const { width, height } = dimensions[name];
    return tag
      .replace(/width="\d+"/, `width="${width}"`)
      .replace(/height="\d+"/, `height="${height}"`)
      .replace(new RegExp(`(${name}-1200\\.webp)\\s+\\d+w`), `$1 ${width}w`);
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
