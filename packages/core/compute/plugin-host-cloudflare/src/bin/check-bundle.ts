//
// Copyright 2026 DXOS.org
//

/* eslint-disable no-console */

import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { importInWorkerd } from '../bundle/import-bundle.ts';
import * as PluginBundle from '../bundle/PluginBundle.ts';

/**
 * Checks a built plugin bundle before it is published: the manifest, that every module parses and its imports resolve
 * inside the bundle, that every bare import is vendored, that no workerd module reaches a stylesheet or a browser-only
 * body, and that the workerd modules import in workerd once their imports are rewritten to `vendor/`.
 *
 * Usage: `check-bundle <dir> [--no-import]`.
 */
const main = async () => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { 'no-import': { type: 'boolean' } },
  });
  if (positionals.length !== 1) {
    console.error('Usage: check-bundle <dir> [--no-import]');
    process.exit(2);
  }
  const dir = resolve(positionals[0]);
  const files = await PluginBundle.readBundle(dir);
  const { problems, roots, vendor } = PluginBundle.check(files);
  const failures =
    problems.length === 0 && !values['no-import']
      ? await importInWorkerd(files, vendor ?? { specifiers: {} }, roots)
      : [];

  const all = [...problems, ...failures.map(({ path, message }) => ({ path, message: `does not import: ${message}` }))];
  if (all.length > 0) {
    console.error(`✗ ${dir}`);
    all.forEach(({ path, message }) => console.error(`  - ${path}: ${message}`));
    process.exit(1);
  }
  const imported = values['no-import'] ? '' : `, ${roots.length} workerd modules imported`;
  console.log(`✓ ${dir} (${Object.keys(files).length} files${imported})`);
};

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
