#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Stages `dx-sandbox`, the local sandbox helper plugin-sandbox compiles (`moon run
// plugin-sandbox:compile-sidecar`), where the desktop app bundles and spawns it. See
// plugin-native's `sandbox-launcher.ts` for why it is a scoped shell command, not a Tauri sidecar.
//
// Usage: node scripts/stage-sandbox-helper.mjs [--required]
//   --required  fail when the helper has not been compiled (release builds); without it a missing
//               helper is a warning, and local sandboxes then report that they cannot start.

import { existsSync } from 'node:fs';
import { chmod, copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcTauriDir = join(appDir, 'src-tauri');
const helper = join(appDir, '..', '..', 'plugins', 'plugin-sandbox', 'dist', 'sidecar', 'dx-sandbox');
const required = process.argv.includes('--required');

if (!existsSync(helper)) {
  const message = `dx-sandbox not compiled at ${helper}; run \`moon run plugin-sandbox:compile-sidecar\`.`;
  if (required) {
    console.error(message);
    process.exit(1);
  }
  console.warn(`${message} Local sandboxes will be unavailable.`);
  process.exit(0);
}

const stage = async (dest) => {
  await mkdir(dirname(dest), { recursive: true });
  await copyFile(helper, dest);
  await chmod(dest, 0o755);
};

// Bundled from here by `bundle.macOS.files` (tauri.conf.json).
await stage(join(srcTauriDir, 'sandbox', 'dx-sandbox'));
// Dev: `bundle.macOS.files` is not applied and `$RESOURCE` resolves to `target/<profile>/`.
for (const profile of ['debug', 'release']) {
  await stage(join(srcTauriDir, 'target', profile, 'dx-sandbox'));
}
