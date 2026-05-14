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
  // tests timing out at exactly 5000ms. Matches the 15s ceiling that
  // `space-list.test.ts > exits within a bounded time` already uses as
  // the explicit "should never take longer than this" upper bound.
  node: { timeout: 15_000 },
});
