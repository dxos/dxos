//
// Copyright 2025 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createConfig } from '../../../vitest.base.config';

export default createConfig({
  dirname: typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url)),
  // Most tests in this package spawn `./bin/dx` via `runDx` and assert on
  // its exit code/output. Under CI load (parallel `MOON_CONCURRENCY=4`)
  // bun + DXOS init can exceed the default 5s test timeout — observed as
  // intermittent merge-queue failures of `dx reset` / `dx space list`
  // tests timing out at exactly 5000ms while the subprocess itself was
  // still well within its 30s spawnSync budget.
  node: { timeout: 30_000 },
});
