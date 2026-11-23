//
// Copyright 2026 DXOS.org
//

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'vite';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { composerPlugin } from './index.ts';

describe('composerPlugin', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'dx-composer-plugin-'));
    mkdirSync(join(root, 'src'));
    writeFileSync(
      join(root, 'dx.config.mjs'),
      `export default { plugin: { key: 'org.example.plugin.hello', name: 'Hello' } };\n`,
    );
    writeFileSync(join(root, 'src', 'plugin.ts'), `export default 'hello';\n`);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  // `vite build <dir>` roots the project at <dir> while the process cwd stays elsewhere.
  test('reads dx.config from the Vite root rather than the process cwd', async ({ expect }) => {
    await build({
      root,
      configFile: false,
      logLevel: 'silent',
      // esbuild, which writes `vendor/`, refuses vitest's module sandbox; the vendor build is checked by check-bundle.
      plugins: composerPlugin({ entry: 'src/plugin.ts', vendor: false }),
    });

    const manifest = JSON.parse(readFileSync(join(root, 'dist', 'manifest.json'), 'utf8'));
    expect(manifest.key).toBe('org.example.plugin.hello');
    expect(manifest.assets).toContain('index.mjs');
  });

  test('a chunk with no CommonJS module imports no React', async ({ expect }) => {
    await build({
      root,
      configFile: false,
      logLevel: 'silent',
      plugins: composerPlugin({ entry: 'src/plugin.ts', vendor: false }),
    });

    const code = readFileSync(join(root, 'dist', 'index.mjs'), 'utf8');
    expect(code).not.toMatch(/from\s*["']react/);
  });

  test('a chunk that declares its own `Map` still loads its CommonJS requires', async ({ expect }) => {
    // Under the package's `node_modules`, so the externals the shim imports (`react`, …) resolve when the bundle runs.
    const packageRoot = mkdtempSync(join(import.meta.dirname, '../../../node_modules/.dx-'));
    try {
      mkdirSync(join(packageRoot, 'src'));
      writeFileSync(
        join(packageRoot, 'dx.config.mjs'),
        `export default { plugin: { key: 'org.example.plugin.map', name: 'Map' } };\n`,
      );
      // A bundled CommonJS module that requires an external is what makes the chunk carry the shim.
      writeFileSync(join(packageRoot, 'src', 'react-version.cjs'), `module.exports = require('react').version;\n`);
      writeFileSync(
        join(packageRoot, 'src', 'plugin.ts'),
        [
          `import version from './react-version.cjs';`,
          `export class Map { readonly kind = 'map'; }`,
          'export default `${new Map().kind}:${typeof version}`;',
          '',
        ].join('\n'),
      );
      await build({
        root: packageRoot,
        configFile: false,
        logLevel: 'silent',
        plugins: composerPlugin({ entry: 'src/plugin.ts', vendor: false }),
      });

      const { default: kind } = await import(/* @vite-ignore */ join(packageRoot, 'dist', 'index.mjs'));
      expect(kind).toBe('map:string');
    } finally {
      rmSync(packageRoot, { recursive: true, force: true });
    }
  });
});
