//
// Copyright 2026 DXOS.org
//

/* eslint-disable no-console */

import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { verifyBundle } from '../bundle/verify-bundle.ts';

/**
 * Checks a built plugin bundle before it is published: the manifest, that every module parses and its imports resolve
 * inside the bundle, that every bare import is vendored, and that no workerd module reaches a stylesheet or a
 * browser-only body. Then it loads the bundle in workerd as EDGE does, imports each workerd module, and, when `vendor/`
 * carries the host, calls `describe()` and fails on an activation failure or a plugin that contributes nothing.
 *
 * Usage: `check-bundle <dir> [--dependency <dir>]... [--no-load]`.
 */
const main = async () => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { 'dependency': { type: 'string', multiple: true }, 'no-load': { type: 'boolean' } },
  });
  if (positionals.length !== 1) {
    console.error('Usage: check-bundle <dir> [--dependency <dir>]... [--no-load]');
    process.exit(2);
  }
  const dir = resolve(positionals[0]);
  const { problems, summary } = await verifyBundle(dir, {
    dependencies: (values.dependency ?? []).map((dependency) => resolve(dependency)),
    load: !values['no-load'],
  });
  if (problems.length > 0) {
    console.error(`✗ ${dir}`);
    problems.forEach(({ path, message }) => console.error(`  - ${path}: ${message}`));
    process.exit(1);
  }
  console.log(`✓ ${dir} (${summary})`);
};

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
