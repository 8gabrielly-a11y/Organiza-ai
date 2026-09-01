import fs from "node:fs";
import path from "node:path";

const roots = ["api", "server"];
const relativeSpecifier = /((?:from\s+|import\s*|export\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s+)["'])(\.{1,2}\/[^"']+)(["'])/g;
const hasRuntimeExtension = /\.(?:js|mjs|cjs|json|node)$/;

function patchFile(file) {
  const source = fs.readFileSync(file, "utf8");
  const patched = source.replace(relativeSpecifier, (full, prefix, specifier, quote) => {
    if (hasRuntimeExtension.test(specifier)) return full;
    return `${prefix}${specifier}.js${quote}`;
  });
  if (patched !== source) fs.writeFileSync(file, patched);
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) patchFile(full);
  }
}

for (const root of roots) walk(root);
console.log("Vercel ESM imports normalized.");
