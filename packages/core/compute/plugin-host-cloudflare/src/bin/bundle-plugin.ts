//
// Copyright 2026 DXOS.org
//

/* eslint-disable no-console */

import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { composerPlugin } from '@dxos/app-framework/vite-plugin';

import * as PluginBundle from '../bundle/PluginBundle.ts';

/** This package's main module, built beside this script: the host EDGE starts a plugin with. */
const HOST_ENTRY = join(dirname(fileURLToPath(import.meta.url)), '..', 'index.mjs');

/**
 * Builds a plugin package's one bundle with `composerPlugin`, the same build `dx registry publish` runs, into
 * `<package>/dist/plugin`, with the EDGE plugin host added to `vendor/`.
 *
 * Usage: `bundle-plugin [--package <dir>] [--out <dir>]`.
 */
const main = async () => {
  const { values } = parseArgs({ options: { package: { type: 'string' }, out: { type: 'string' } } });
  const root = resolve(values.package ?? process.cwd());
  const outDir = values.out ?? 'dist/plugin';
  // `composerPlugin` finds the plugin's `dx.config.ts` from the working directory.
  process.chdir(root);
  const { build } = await import('vite');
  await build({
    root,
    configFile: false,
    logLevel: 'warn',
    plugins: composerPlugin({
      vendor: { extra: [{ specifier: PluginBundle.HOST_SPECIFIER, importers: [], path: HOST_ENTRY }] },
    }),
    build: { outDir, emptyOutDir: true },
  });
  console.log(`✓ ${join(root, outDir)}`);
};

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
