//
// Copyright 2026 DXOS.org
//

import { createVSIX } from '@vscode/vsce';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist/vscode-mdl.vsix');

/**
 * Packages the `.vsix` from a staging copy whose manifest has no dependency fields: vsce reads `@types/vscode` as a
 * semver range and fails on the workspace's `catalog:` specifiers, and the bundles already carry every dependency.
 */
const stage = mkdtempSync(join(tmpdir(), 'vscode-mdl-'));
try {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  delete manifest.dependencies;
  delete manifest.devDependencies;
  writeFileSync(join(stage, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  for (const entry of [
    'README.md',
    '.vscodeignore',
    'language-configuration.json',
    'language-configuration.block.json',
    'syntaxes',
    'dist/extension.cjs',
    'dist/server.cjs',
  ]) {
    cpSync(join(root, entry), join(stage, entry), { recursive: true });
  }
  await createVSIX({ cwd: stage, packagePath: out, dependencies: false, skipLicense: true });
} finally {
  rmSync(stage, { recursive: true, force: true });
}
