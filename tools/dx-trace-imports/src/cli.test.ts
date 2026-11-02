//
// Copyright 2026 DXOS.org
//

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { describe, onTestFinished, test } from 'vitest';

const cli = resolve(import.meta.dirname, '../cli.js');

const BANS = `
workerd:
  ban: [banned, banned-ui]
  allow: [banned-ui/types]
node:
  ban: [react]
`;

/** Writes `files` (path → contents; objects are JSON) under a fresh directory and returns it. */
const fixture = (files: Record<string, string | object>): string => {
  const root = mkdtempSync(join(tmpdir(), 'dx-trace-imports-'));
  onTestFinished(() => rmSync(root, { recursive: true, force: true }));
  for (const [file, contents] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), typeof contents === 'string' ? contents : JSON.stringify(contents));
  }
  return root;
};

/** A package whose `workerd` export imports `workerd.js`'s body, with a `banned-ui` dependency installed. */
const workerdPackage = (workerd: string): string =>
  fixture({
    'package.json': {
      name: 'fixture',
      type: 'module',
      exports: { '.': { workerd: './workerd.js', default: './index.js' } },
    },
    'workerd.js': workerd,
    'index.js': "import 'react';\n",
    'bans.yml': BANS,
    'node_modules/banned-ui/package.json': {
      name: 'banned-ui',
      type: 'module',
      exports: { '.': './index.js', './types': './types.js' },
    },
    'node_modules/banned-ui/index.js': 'export const ui = 1;\n',
    'node_modules/banned-ui/types.js': "import 'banned';\nexport const types = 1;\n",
  });

const run = (cwd: string, conditions: string) =>
  spawnSync(
    process.execPath,
    [cli, '--conditional-exports', '--bans', join(cwd, 'bans.yml'), '--fail-on', 'present', '--conditions', conditions],
    { cwd, encoding: 'utf8' },
  );

describe('--bans', () => {
  test('fails when a runtime build imports a package banned for that runtime', ({ expect }) => {
    const result = run(workerdPackage("import 'banned-ui';\n"), 'workerd');
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('banned-ui');
  });

  test('applies only the lists of the conditions being traced', ({ expect }) => {
    // `react` is banned for node only, and the node build is not traced here.
    const result = run(workerdPackage("import 'react';\n"), 'workerd');
    expect(result.status).toBe(0);
  });

  test('skips a package with no export declaring the condition', ({ expect }) => {
    const cwd = workerdPackage('');
    writeFileSync(
      join(cwd, 'package.json'),
      JSON.stringify({ name: 'fixture', type: 'module', exports: './index.js' }),
    );
    const result = run(cwd, 'workerd');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('No export subpaths declare any of [workerd]');
  });
});

describe('--allow', () => {
  test('exempts an allowed subpath of a banned package', ({ expect }) => {
    const cwd = workerdPackage("import 'banned-ui/types';\n");
    writeFileSync(join(cwd, 'node_modules/banned-ui/types.js'), 'export const types = 1;\n');
    expect(run(cwd, 'workerd').status).toBe(0);
  });

  test('still traces into an allowed subpath, so it fails once that imports a banned package', ({ expect }) => {
    const result = run(workerdPackage("import 'banned-ui/types';\n"), 'workerd');
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('[external] banned');
  });
});
