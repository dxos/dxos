//
// Copyright 2026 DXOS.org
//

/* eslint-disable no-console */

import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { buildBundle } from '../bundle/build-bundle.ts';

/**
 * Builds a plugin package's one bundle with `composerPlugin`, the same build `dx registry publish` runs, into
 * `<package>/dist/plugin`, with the EDGE plugin host added to `vendor/`.
 *
 * Usage: `bundle-plugin [--package <dir>]`.
 */
const main = async () => {
  const { values } = parseArgs({ options: { package: { type: 'string' } } });
  console.log(`✓ ${await buildBundle(resolve(values.package ?? process.cwd()))}`);
};

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
