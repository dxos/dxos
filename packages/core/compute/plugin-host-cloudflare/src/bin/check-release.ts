//
// Copyright 2026 DXOS.org
//

/* eslint-disable no-console */

import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { buildBundle, buildDependencyBundles } from '../bundle/build-bundle.ts';
import { verifyBundle } from '../bundle/verify-bundle.ts';

/**
 * Checks that a plugin package can be published to EDGE: builds its one bundle as `dx registry publish` does, builds
 * the bundles of the plugins in its `dependsOn` closure, and runs `check-bundle` on it with those beside it.
 *
 * Usage: `check-release [--package <dir>]`.
 */
const main = async () => {
  const { values } = parseArgs({ options: { package: { type: 'string' } } });
  const packageDir = resolve(values.package ?? process.cwd());
  const bundle = await buildBundle(packageDir);
  const dependencies = await buildDependencyBundles(packageDir, bundle);
  const { problems, summary } = await verifyBundle(bundle, { dependencies });
  if (problems.length > 0) {
    console.error(`✗ ${bundle}`);
    problems.forEach(({ path, message }) => console.error(`  - ${path}: ${message}`));
    process.exit(1);
  }
  console.log(`✓ ${bundle} (${summary}; ${dependencies.length} dependency bundles)`);
};

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
