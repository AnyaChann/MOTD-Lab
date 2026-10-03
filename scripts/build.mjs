// Assembles src/ into the single-file index.html that is shipped.
//   node scripts/build.mjs           write index.html
//   node scripts/build.mjs --check   fail if index.html is not what the sources produce
// No dependencies: the output is plain concatenation, so it stays easy to audit.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

export function build() {
  const template = read("src/template.html");
  for (const marker of ["@@CSS@@\n", "@@JS@@\n"]) {
    if (template.split(marker).length !== 2) throw new Error(`src/template.html must contain ${marker.trim()} exactly once`);
  }
  const files = readdirSync(path.join(root, "src/js")).filter((f) => f.endsWith(".js")).sort();
  const js = files.map((f) => read(`src/js/${f}`)).join("");
  // Function replacers: the sources contain "$" sequences that String.replace would otherwise expand.
  return template.replace("@@CSS@@\n", () => read("src/styles.css")).replace("@@JS@@\n", () => js);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const output = build();
  if (process.argv.includes("--check")) {
    if (read("index.html") !== output) {
      console.error("index.html is out of date with src/. Run: npm run build");
      process.exit(1);
    }
    console.log("index.html matches src/");
  } else {
    writeFileSync(path.join(root, "index.html"), output);
    console.log(`index.html written (${output.length} bytes)`);
  }
}
