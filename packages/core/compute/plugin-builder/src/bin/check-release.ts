#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

/* eslint-disable no-console */

import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { buildBundle } from '../build-bundle.ts';
import { checkStaleDist } from '../stale-dist.ts';
import { verifyBundle } from '../verify-bundle.ts';

/**
 * Checks that a plugin package can be published to EDGE: builds its one bundle as `dx registry publish` does and runs
 * `check-bundle` on it. The plugin runs alone on EDGE, so no other plugin's bundle is built beside it.
 *
 * Fails when the package's `dist/lib`, which the bundle reads, is older than its `src/`; `--allow-stale` skips that.
 *
 * Usage: `check-release [--package <dir>] [--allow-stale]`.
 */
const main = async () => {
  const { values } = parseArgs({ options: { 'package': { type: 'string' }, 'allow-stale': { type: 'boolean' } } });
  const packageDir = resolve(values.package ?? process.cwd());
  const stale = checkStaleDist(packageDir, { allowStale: values['allow-stale'] });
  if (stale) {
    console.error(stale);
    process.exit(1);
  }
  const bundle = await buildBundle(packageDir);
  // `buildBundle` always vendors the host, so a bundle without it is a broken build, not one to skip.
  const { problems, summary } = await verifyBundle(bundle, { requireHost: true });
  if (problems.length > 0) {
    console.error(`✗ ${bundle}`);
    problems.forEach(({ path, message }) => console.error(`  - ${path}: ${message}`));
    process.exit(1);
  }
  console.log(`✓ ${bundle} (${summary})`);
};

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
