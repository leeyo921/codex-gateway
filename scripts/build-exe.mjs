/**
 * codex-gateway single-executable builder.
 *
 * Produces a standalone `codex-gateway(.exe)` that needs NO Node.js install:
 *   1. esbuild bundles src/server.ts -> build/bundle.cjs (single file)
 *   2. node --experimental-sea-config generates the SEA blob
 *   3. the running node binary is copied to the output exe
 *   4. postject injects the blob into the copy
 *
 * Run with:  npm run build:exe
 */
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const buildDir = join(root, "build");
const isWin = process.platform === "win32";
const outName = isWin ? "codex-gateway.exe" : "codex-gateway";
const outExe = join(buildDir, outName);
const bundle = join(buildDir, "bundle.cjs");
const blob = join(buildDir, "sea-prep.blob");
const seaConfig = join(root, "sea-config.json");
const FUSE = "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2";

function step(msg) {
  console.log(`\n→ ${msg}`);
}

mkdirSync(buildDir, { recursive: true });

step("1/4 Bundling src/server.ts with esbuild...");
await build({
  entryPoints: [join(root, "src/server.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: bundle,
  // fsevents is an optional macOS-only native dep pulled by some tooling
  external: ["fsevents"],
});

step("2/4 Generating SEA blob...");
execFileSync(process.execPath, ["--experimental-sea-config", seaConfig], {
  cwd: root,
  stdio: "inherit",
});

step(`3/4 Copying Node runtime -> ${outName}...`);
if (existsSync(outExe)) rmSync(outExe, { force: true });
copyFileSync(process.execPath, outExe);

step("4/4 Injecting blob with postject...");
const postject = require.resolve("postject/dist/cli.js");
execFileSync(
  process.execPath,
  [
    postject,
    outExe,
    "NODE_SEA_BLOB",
    blob,
    "--sentinel-fuse",
    FUSE,
    ...(process.platform === "darwin" ? ["--macho-segment-name", "NODE_SEA"] : []),
  ],
  { cwd: root, stdio: "inherit" }
);

console.log(`\n✅ Done. Standalone executable: ${outExe}`);
console.log("   Double-click it (or run from a terminal) — no Node.js required.");
