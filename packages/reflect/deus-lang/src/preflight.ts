//
// Copyright 2026 DXOS.org
//

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const kernel = resolve(root, '../deus-kernel');

/**
 * What a container lacks to run the whole suite, one line each with its fix. Agents lost runs to
 * failures deep inside the native, browser and bindings tests whose cause was a missing tool.
 */
export const missingTools = (): string[] => {
  const missing: string[] = [];
  const fix = 'run `bash scripts/setup.sh`';
  if (spawnSync('cargo', ['--version'], { cwd: kernel }).status !== 0) {
    missing.push(`cargo (the Rust kernel builds for the native and browser tests): ${fix}`);
  } else {
    const wanted = [...readFileSync(join(kernel, 'rust-toolchain.toml'), 'utf8').matchAll(/"(wasm32-[\w-]+)"/g)].map(
      (match) => match[1],
    );
    const installed =
      spawnSync('rustup', ['target', 'list', '--installed'], { cwd: kernel, encoding: 'utf8' }).stdout ?? '';
    for (const target of wanted) {
      if (!installed.split('\n').includes(target)) {
        missing.push(`the Rust target ${target} (deus-kernel/rust-toolchain.toml): ${fix}`);
      }
    }
  }
  if (!existsSync(join(root, 'node_modules/.bin/tsc'))) {
    missing.push(`node_modules/.bin/tsc (the bindings test type-checks generated code): ${fix}`);
  }
  return missing;
};
