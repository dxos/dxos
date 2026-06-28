//
// Copyright 2025 DXOS.org
//

// Fetches a pinned Ollama macOS runtime for the Tauri sidecar.
//
// Modern Ollama is not a single binary: the `ollama` launcher loads sibling `llama-server` and
// `libggml*/libllama*/mlx_metal_*` libraries at runtime. The launcher is bundled as a Tauri
// sidecar (signed, in the app's MacOS dir); the libraries ship as bundle resources and the
// sidecar is pointed at them via `OLLAMA_LIBRARY_PATH` (see capabilities/ollama.ts). The runtime
// is large and version-specific, so it is downloaded at build time (gitignored) rather than
// committed.
//
// Pinned to an exact version + SHA-256 for reproducibility and supply-chain integrity. To bump:
// update VERSION and SHA256 together (compute via `shasum -a 256 ollama-darwin.tgz`).

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { access, chmod, copyFile, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
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

const scriptDir = dirname(fileURLToPath(import.meta.url));
const srcTauriDir = join(scriptDir, '..', 'src-tauri');
const sidecarDir = join(srcTauriDir, 'sidecar');
const runtimeDir = join(sidecarDir, 'ollama-runtime');
const marker = join(runtimeDir, '.ollama-version');
const launcher = join(runtimeDir, 'ollama');

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
await ensureDevRuntimeLink();
