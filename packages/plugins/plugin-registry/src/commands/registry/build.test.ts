//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import { buildInProcess, isViteBuild, resolveImport } from './build.ts';

const packageRoot = join(import.meta.dirname, '../../..');

describe('isViteBuild', () => {
  test('an unset command and `vite build` build in process; anything else runs as a command', ({ expect }) => {
    expect(isViteBuild(undefined)).toBe(true);
    expect(isViteBuild(' vite build ')).toBe(true);
    expect(isViteBuild('vite build --mode staging')).toBe(false);
    expect(isViteBuild('pnpm build')).toBe(false);
  });
});

describe('resolveImport', () => {
  test("resolves a subpath through the package's `import` export", ({ expect }) => {
    expect(resolveImport(packageRoot, '@dxos/app-framework/vite-plugin')).toMatch(
      /app-framework\/dist\/lib\/vite-plugin\.mjs$/,
    );
    expect(resolveImport(packageRoot, 'vite')).toMatch(/vite\/dist\/node\/index\.js$/);
    expect(resolveImport(tmpdir(), 'vite')).toBeUndefined();
  });
});

describe('buildInProcess', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'dx-build-'));
    // Bare imports in the fixture resolve through this package's own dependencies.
    symlinkSync(join(packageRoot, 'node_modules'), join(dir, 'node_modules'));
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'hello', version: '1.2.3', type: 'module' }));
    writeFileSync(
      join(dir, 'dx.config.mjs'),
      `export default { plugin: { key: 'org.example.plugin.hello', name: 'Hello' } };\n`,
    );
    writeFileSync(join(dir, 'src', 'plugin.tsx'), `export default 'hello';\n`);
    // esbuild, which writes `vendor/`, refuses vitest's module sandbox; the vendor build is checked by `cli:smoke`.
    writeFileSync(
      join(dir, 'vite.config.mjs'),
      [
        "import { composerPlugin } from '@dxos/app-framework/vite-plugin';",
        "export default { logLevel: 'silent', plugins: composerPlugin({ vendor: false }), build: { outDir: 'out' } };",
      ].join('\n'),
    );
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("runs the project's own vite.config with its Vite, restoring the working directory", async ({ expect }) => {
    const cwd = process.cwd();
    await EffectEx.runPromise(buildInProcess({ dir, outDir: join(dir, 'dist'), env: { DX_BUILD_TEST: '1' } }));

    const manifest = JSON.parse(readFileSync(join(dir, 'out', 'manifest.json'), 'utf8'));
    expect(manifest).toMatchObject({ key: 'org.example.plugin.hello', version: '1.2.3' });
    expect(process.cwd()).toBe(cwd);
    expect(process.env.DX_BUILD_TEST).toBeUndefined();
  });

  test('fails with a hint when the project does not install Vite', async ({ expect }) => {
    rmSync(join(dir, 'node_modules'));
    const error = await EffectEx.runPromise(Effect.flip(buildInProcess({ dir, outDir: join(dir, 'dist'), env: {} })));
    expect(error.message).toContain('vite is not installed');
  });
});
