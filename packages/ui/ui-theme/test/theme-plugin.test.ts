//
// Copyright 2026 DXOS.org
//

/**
 * Builds a consumer app against an installed copy of this package, which in-repo runs never exercise.
 */

import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { build } from 'vite';
import { afterAll, describe, test } from 'vitest';

const PACKAGE_ROOT = resolve(__dirname, '..');

const writeFile = (path: string, content: string) => {
  mkdirSync(resolve(path, '..'), { recursive: true });
  writeFileSync(path, content);
};

describe('ThemePlugin installed in node_modules', () => {
  const root = mkdtempSync(join(tmpdir(), 'ui-theme-consumer-'));
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  test(
    'scans the app and built @dxos packages, not the rest of node_modules',
    { timeout: 60_000 },
    async ({ expect }) => {
      const installed = join(root, 'node_modules/@dxos/ui-theme');
      mkdirSync(installed, { recursive: true });
      cpSync(join(PACKAGE_ROOT, 'src'), join(installed, 'src'), { recursive: true });
      cpSync(join(PACKAGE_ROOT, 'package.json'), join(installed, 'package.json'));
      symlinkSync(join(PACKAGE_ROOT, 'node_modules'), join(installed, 'node_modules'));

      writeFile(join(root, 'package.json'), JSON.stringify({ name: 'consumer', private: true, type: 'module' }));
      writeFile(
        join(root, 'index.html'),
        '<div class="mt-[7px]"></div><script type="module" src="/src/main.ts"></script>',
      );
      writeFile(join(root, 'src/main.ts'), "import '@dxos-theme';\nexport const own = 'translate-x-[1337px]';\n");
      writeFile(
        join(root, 'node_modules/@dxos/react-fake/dist/lib/index.mjs'),
        "export const cls = 'rotate-[17deg]';\n",
      );
      writeFile(join(root, 'node_modules/unrelated/lib/index.mjs'), "export const cls = 'skew-x-[33deg]';\n");

      const { ThemePlugin } = await import(join(installed, 'src/plugins/ThemePlugin.ts'));
      await build({ root, configFile: false, logLevel: 'silent', plugins: [ThemePlugin({})] });

      const assets = join(root, 'dist/assets');
      const css = readdirSync(assets)
        .filter((file) => file.endsWith('.css'))
        .map((file) => readFileSync(join(assets, file), 'utf-8'))
        .join('\n');
      expect(css).toContain('.translate-x-\\[1337px\\]');
      expect(css).toContain('.mt-\\[7px\\]');
      expect(css).toContain('.rotate-\\[17deg\\]');
      expect(css).not.toContain('.skew-x-\\[33deg\\]');
    },
  );
});
