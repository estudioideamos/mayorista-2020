import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import sharp from "sharp";
import postcss from "postcss";

const pages = ["index.html", "contacto.html", "recursos-humanos.html"];
const base = "https://estudioideamos.github.io/mayorista-2020/";
for (const file of pages) {
  const html = await fs.readFile(file, "utf8");
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${file}: one H1`);
  assert.match(html, /<html lang="es-AR">/);
  assert.match(html, /<link\s+rel="canonical"/);
  assert.match(html, /property="og:image"/);
  assert.match(html, /name="twitter:card"/);
  assert(!html.includes("mailto:"), `${file}: no mail client`);
  assert(!html.includes("fonts.googleapis.com"), `${file}: local fonts`);
  const schema = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  );
  assert(schema, `${file}: structured data`);
  const graph = JSON.parse(schema[1])["@graph"];
  if (file === "index.html")
    assert.equal(graph.filter((n) => n["@type"] === "Store").length, 4);
  const hash = createHash("sha256").update(schema[1]).digest("base64");
  assert(html.includes(`'sha256-${hash}'`), `${file}: CSP hash`);
  for (const image of html.matchAll(/<img\b[^>]*>/g))
    assert(/alt="[^"]*"/.test(image[0]), `${file}: image alternative text`);
  for (const m of html.matchAll(/(?:src|href|action)="([^"]+)"/g)) {
    const ref = m[1];
    if (/^(https?:|data:)/.test(ref)) continue;
    const [resource, fragment] = ref.split("#");
    const target = resource.split("?")[0] || file;
    await fs.access(target);
    if (fragment && target.endsWith(".html")) {
      const linked = await fs.readFile(target, "utf8");
      assert(linked.includes(`id="${fragment}"`), `${file}: missing ${ref}`);
    }
  }
  console.log(`${file}: metadata, schema, CSP, internal links and images OK`);
}
for (const filename of ["styles.css", "styles.min.css", "assets/fonts.css"]) {
  const css = await fs.readFile(filename, "utf8");
  postcss.parse(css);
  for (const m of css.matchAll(/url\(["']?([^)'"\s]+)["']?\)/g)) {
    const ref = m[1];
    if (/^(#|data:|https?:)/.test(ref)) continue;
    await fs.access(path.join(path.dirname(filename), ref.split("?")[0]));
  }
}
const social = await sharp("assets/m20-social.jpg").metadata();
assert.equal(social.width, 1200);
assert.equal(social.height, 630);
assert(
  (await fs.stat("assets/m20-social.jpg")).size < 300000,
  "Social image budget",
);
for (const name of [
  "contacto.js",
  "recursos-humanos.js",
  "assets/cursor-link.svg",
])
  assert.equal(
    await fs.access(name).then(
      () => true,
      () => false,
    ),
    false,
  );
const sitemap = await fs.readFile("sitemap.xml", "utf8");
for (const suffix of ["", "contacto.html", "recursos-humanos.html"])
  assert(sitemap.includes(`<loc>${base + suffix}</loc>`));
console.log("CSS, local assets, social image and sitemap OK");
