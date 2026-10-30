//
// Copyright 2026 DXOS.org
//

/* eslint-disable no-console */

import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { loadBundle } from '../bundle/load-bundle.ts';
import * as PluginBundle from '../bundle/PluginBundle.ts';

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
  const files = await PluginBundle.readBundle(dir);
  const { problems, roots, vendor } = PluginBundle.check(files);
  const fail = (messages: readonly { path: string; message: string }[]) => {
    console.error(`✗ ${dir}`);
    messages.forEach(({ path, message }) => console.error(`  - ${path}: ${message}`));
    process.exit(1);
  };
  if (problems.length > 0) {
    fail(problems);
  }
  if (values['no-load']) {
    console.log(`✓ ${dir} (${Object.keys(files).length} files)`);
    return;
  }

  const dependencies = await Promise.all(
    (values.dependency ?? []).map((dependency) => PluginBundle.readBundle(resolve(dependency))),
  );
  await using bundle = await loadBundle(files, { dependencies });
  const failures = await bundle.importModules(roots);
  if (failures.length > 0) {
    fail(failures.map(({ path, message }) => ({ path, message: `does not import: ${message}` })));
  }
  if (!vendor?.specifiers[PluginBundle.HOST_SPECIFIER]) {
    console.log(`✓ ${dir} (${roots.length} workerd modules imported; no vendored host, so describe() was not run)`);
    return;
  }
  const catalog = await bundle.describe();
  const contributions = catalog.operations.length + catalog.skills.length + catalog.types.length;
  const activation = [
    ...catalog.failures.map(({ id, phase, message }) => ({ path: id, message: `failed to ${phase}: ${message}` })),
    ...(contributions === 0
      ? [{ path: PluginBundle.MANIFEST_FILE, message: 'contributes no operations, skills or types on EDGE' }]
      : []),
  ];
  if (activation.length > 0) {
    fail(activation);
  }
  const summary = `${catalog.operations.length} operations, ${catalog.skills.length} skills, ${catalog.types.length} types`;
  console.log(`✓ ${dir} (${roots.length} workerd modules imported; ${summary})`);
};

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
