import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

const outputDirectory = new URL("../dist/client/", import.meta.url);
const basePath = "/kt-project";
const textExtensions = new Set([".css", ".html", ".js", ".json", ".rsc"]);

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(path));
    else files.push(path);
  }

  return files;
}

const outputPath = outputDirectory.pathname;
const files = await collectFiles(outputPath);

for (const file of files) {
  if (!textExtensions.has(extname(file))) continue;
  const source = await readFile(file, "utf8");
  const updated = source.replace(/(?<!\/kt-project)\/assets\//g, `${basePath}/assets/`);
  if (updated !== source) await writeFile(file, updated);
}

await mkdir(outputPath, { recursive: true });
await writeFile(join(outputPath, ".nojekyll"), "");

const index = await readFile(join(outputPath, "index.html"), "utf8");
if (/(?<!\/kt-project)\/assets\//.test(index)) {
  throw new Error("GitHub Pages build still contains unprefixed asset URLs.");
}

console.log(`GitHub Pages artifact prepared for ${basePath}/`);
