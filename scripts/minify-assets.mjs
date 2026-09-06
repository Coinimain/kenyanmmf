import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import CleanCSS from "clean-css";
import { minify as minifyJavaScript } from "terser";

const outputDirectory = path.resolve(process.argv[2] ?? "_site");

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath)));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

function minifyCss(source, relativePath) {
  const result = new CleanCSS({
    level: 1,
    rebase: false,
    returnPromise: false
  }).minify(source);

  if (result.errors.length > 0) {
    throw new Error(`CSS minification failed for ${relativePath}: ${result.errors.join("; ")}`);
  }

  for (const warning of result.warnings) {
    console.warn(`CSS warning in ${relativePath}: ${warning}`);
  }

  return result.styles;
}

async function minifyJs(source, relativePath) {
  const result = await minifyJavaScript({ [relativePath]: source }, {
    compress: {
      passes: 2
    },
    mangle: true,
    module: false,
    toplevel: false,
    format: {
      comments: false
    }
  });

  if (typeof result.code !== "string") {
    throw new Error(`JavaScript minification produced no output for ${relativePath}`);
  }

  return result.code;
}

const assetFiles = (await collectFiles(outputDirectory))
  .filter((file) => {
    const extension = path.extname(file).toLowerCase();
    return (extension === ".css" || extension === ".js") && !file.includes(".min.");
  })
  .sort();

if (assetFiles.length === 0) {
  throw new Error(`No CSS or JavaScript files found in ${outputDirectory}`);
}

let totalBefore = 0;
let totalAfter = 0;

for (const file of assetFiles) {
  const relativePath = path.relative(outputDirectory, file);
  const extension = path.extname(file).toLowerCase();
  const source = await readFile(file, "utf8");
  const minified = extension === ".css"
    ? minifyCss(source, relativePath)
    : await minifyJs(source, relativePath);

  const before = Buffer.byteLength(source);
  const output = `${minified}\n`;
  const after = Buffer.byteLength(output);

  await writeFile(file, output, "utf8");

  totalBefore += before;
  totalAfter += after;
  console.log(`${relativePath}: ${before} -> ${after} bytes`);
}

const saved = totalBefore - totalAfter;
const reduction = ((saved / totalBefore) * 100).toFixed(1);

console.log(
  `Minified ${assetFiles.length} assets: ${totalBefore} -> ${totalAfter} bytes ` +
  `(${saved} bytes saved, ${reduction}% reduction).`
);
