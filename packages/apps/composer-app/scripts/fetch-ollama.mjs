//
// Copyright 2025 DXOS.org
//

// Fetches a pinned Ollama macOS runtime for the Tauri sidecar.
//
// Modern Ollama is not a single binary: the `ollama` launcher loads sibling `llama-server` and
// `libggml*/libllama*/mlx_metal_*` libraries relative to its own executable path, ignoring
// `OLLAMA_LIBRARY_PATH` (see capabilities/ollama.ts). The launcher is bundled as a Tauri sidecar
// (signed, in the app's MacOS dir); the libraries ship as bundle resources at the exact relative
// path it looks up. The runtime is large and version-specific, so it is downloaded at build time
// (gitignored) rather than committed.
//
// Pinned to an exact version + SHA-256 for reproducibility and supply-chain integrity. To bump:
// update VERSION and SHA256 together (compute via `shasum -a 256 ollama-darwin.tgz`).

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { access, chmod, copyFile, lstat, mkdir, readFile, readlink, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const VERSION = 'v0.30.11';
const SHA256 = '4620272018aa974fb146741e51fa69dbecd141922143354d4643a45381faf2e6';
const ASSET = 'ollama-darwin.tgz';
const URL = `https://github.com/ollama/ollama/releases/download/${VERSION}/${ASSET}`;

// Tauri matches sidecars by `<name>-<target-triple>`; the universal launcher serves both arches.
const SIDECAR_TARGETS = ['aarch64-apple-darwin', 'x86_64-apple-darwin'];

// Metal shader libraries (mlx.metallib) aren't Mach-O, so codesign can only attach their
// signature via an extended attribute. Tauri's macOS bundler strips all extended attributes from
// the assembled .app (`xattr -crs`) before it signs anything, which destroys that signature —
// verified locally; plain dylibs/executables are unaffected since their signature is embedded in
// the binary itself. Tauri also never signs files placed via `bundle.macOS.files` (only entries
// under `bundle.macOS.frameworks`), so the fix is to ship the metallib files inside a minimal real
// framework (registered in tauri.conf.json, individually signed by Tauri like any other framework
// member) and symlink them back to the path the ollama launcher actually looks for.
const METAL_VARIANTS = ['mlx_metal_v3', 'mlx_metal_v4'];

const scriptDir = dirname(fileURLToPath(import.meta.url));
const srcTauriDir = join(scriptDir, '..', 'src-tauri');
const sidecarDir = join(srcTauriDir, 'sidecar');
const runtimeDir = join(sidecarDir, 'ollama-runtime');
// Kept outside runtimeDir: `bundle.macOS.files` copies that whole directory into the bundle
// wholesale, and this marker is our own fetch-time cache bookkeeping, not part of the shipped
// runtime — a plain text file here would otherwise hit the same "not signed at all" failure as
// mlx.metallib once nested under Contents/MacOS/, since Tauri's final codesign pass requires every
// file it finds there to already carry its own signature, whatever its type.
const marker = join(sidecarDir, '.ollama-version');
const launcher = join(runtimeDir, 'ollama');
const frameworkDir = join(sidecarDir, 'ollama-metal.framework');
const frameworkLibrariesDir = join(frameworkDir, 'Libraries');
// Framework validity requires the framework's main binary to be named after the framework itself
// (`<name>.framework/<name>`) — verified locally; a mismatched name fails as "bundle format
// unrecognized, invalid, or unsuitable" once nested inside another app bundle.
const frameworkBinary = join(frameworkDir, 'ollama-metal');

// Packaged builds place the runtime at `Contents/MacOS/lib/ollama` and the framework at
// `Contents/Frameworks/ollama-metal.framework` (4 levels up, then down into Frameworks/); local
// dev runs the runtime directly out of `sidecar/ollama-runtime`, 2 levels from the framework (a
// sibling directory, see ensureDevRuntimeLink). Pass `--packaged` (done by deploy-tauri.yaml) to
// target the former.
const packaged = process.argv.includes('--packaged');
const metallibSymlinkPrefix = packaged ? '../../../../Frameworks/' : '../../';

const exists = async (path) =>
  access(path).then(
    () => true,
    () => false,
  );

// Download + verify + extract the pinned runtime (skipped when already present).
const ensureRuntime = async () => {
  if ((await exists(launcher)) && (await readFile(marker, 'utf8').catch(() => '')).trim() === VERSION) {
    console.log(`[ollama] runtime ${VERSION} already present`);
    return;
  }

  const tmp = join(sidecarDir, `${ASSET}.download`);
  await mkdir(sidecarDir, { recursive: true });

  console.log(`[ollama] downloading ${URL}`);
  const response = await fetch(URL);
  if (!response.ok || !response.body) {
    throw new Error(`download failed: HTTP ${response.status}`);
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(tmp));

  const digest = createHash('sha256')
    .update(await readFile(tmp))
    .digest('hex');
  if (digest !== SHA256) {
    await rm(tmp, { force: true });
    throw new Error(`checksum mismatch for ${ASSET}: expected ${SHA256}, got ${digest}`);
  }
  console.log('[ollama] checksum verified');

  await rm(runtimeDir, { recursive: true, force: true });
  await mkdir(runtimeDir, { recursive: true });
  execFileSync('tar', ['xzf', tmp, '-C', runtimeDir]);
  await rm(tmp, { force: true });
  await writeFile(marker, `${VERSION}\n`);
  console.log(`[ollama] runtime ${VERSION} ready at ${runtimeDir}`);
};

// Place the launcher as triple-named sidecars so Tauri bundles + signs it.
const ensureSidecars = async () => {
  for (const target of SIDECAR_TARGETS) {
    const sidecar = join(sidecarDir, `ollama-${target}`);
    await copyFile(launcher, sidecar);
    await chmod(sidecar, 0o755);
  }
};

// Move each variant's mlx.metallib into the framework and leave a symlink in its place, so the
// launcher's hardcoded lookup path is unaffected while the real bytes live somewhere Tauri signs.
const ensureMetalFramework = async () => {
  await mkdir(frameworkLibrariesDir, { recursive: true });

  if (!(await exists(frameworkBinary))) {
    const stubSource = join(sidecarDir, '.ollama-metal-stub.c');
    await writeFile(stubSource, 'int OllamaMetalFrameworkMarker = 1;\n');
    execFileSync('clang', ['-dynamiclib', '-o', frameworkBinary, stubSource]);
    await rm(stubSource, { force: true });
  }

  for (const variant of METAL_VARIANTS) {
    const metallib = join(runtimeDir, variant, 'mlx.metallib');
    const dest = join(frameworkLibrariesDir, `${variant}_metallib`);
    const expectedTarget = `${metallibSymlinkPrefix}ollama-metal.framework/Libraries/${variant}_metallib`;

    const stat = await lstat(metallib).catch(() => null);
    if (!stat) {
      continue; // This variant doesn't ship a metallib.
    }
    if (stat.isSymbolicLink()) {
      // Re-point an already-migrated symlink if it targets the wrong layout (dev vs --packaged).
      if ((await readlink(metallib)) !== expectedTarget) {
        await rm(metallib);
        await symlink(expectedTarget, metallib);
      }
      continue;
    }
    await rm(dest, { force: true });
    await copyFile(metallib, dest);
    await rm(metallib);
    await symlink(expectedTarget, metallib);
  }
};

// Dev only: Tauri runs the sidecar from `target/<profile>/` and `bundle.macOS.files` is not applied,
// so Ollama (which finds llama-server relative to its own exe) can't see the runtime. Symlink it
// into `target/<profile>/lib/ollama` — the location the launcher searches. Packaged builds use
// `bundle.macOS.files` instead (Contents/MacOS/lib/ollama).
const ensureDevRuntimeLink = async () => {
  for (const profile of ['debug', 'release']) {
    const libDir = join(srcTauriDir, 'target', profile, 'lib');
    await mkdir(libDir, { recursive: true });
    const link = join(libDir, 'ollama');
    await rm(link, { recursive: true, force: true });
    await symlink(runtimeDir, link, 'dir');
  }
};

await ensureRuntime();
await ensureSidecars();
await ensureMetalFramework();
await ensureDevRuntimeLink();
