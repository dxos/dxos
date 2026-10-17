#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Runs from source: node strips the kernel's types, so no build step is needed.
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';

import { nativeFor, seedHash, startNativeBuild } from '../scripts/native.mjs';

// `deus build` finds the kernel sources and the node binary through these.
process.env.DEUS_HOME ??= dirname(import.meta.dirname);
process.env.DEUS_NODE ??= process.execPath;
// DEUS code has no isatty; this tells the CLI it may colour its output.
if (process.stdout.isTTY) {
  process.env.DEUS_TTY ??= '1';
}

// A native build of the same seed runs every command 10 to 100 times faster (D171); until one
// exists, the seed runs here and one is built in the background.
// Theorem verdicts name the checker that reached them, so a toolchain change rechecks them (task 79f72c44).
process.env.DEUS_IMAGE_HASH ??= seedHash();
const native = nativeFor(process.env);
if (native.binary) {
  // `DEUS_KERNEL` tells the CLI it runs natively, so a test failure is confirmed on node (task d0d2915a).
  const result = spawnSync(native.binary, process.argv.slice(2), {
    stdio: 'inherit',
    env: { ...process.env, DEUS_KERNEL: 'native' },
  });
  process.exitCode = result.status ?? 1;
} else {
  if (native.failed) {
    console.warn(
      `deus: the native build failed, so this runs on node (slower); see ${native.failed}, delete it to retry.`,
    );
  }
  if (native.build) {
    startNativeBuild(native.build);
  }
  // Loaded only here: reading the kernel's sources is most of node's start-up time.
  const { main } = await import('../src/kernel/main.ts');
  process.exitCode = main(process.argv.slice(2));
}
