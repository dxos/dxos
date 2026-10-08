//
// Copyright 2026 DXOS.org
//

import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, describe, test } from 'vitest';

import { createResolver } from './resolver.ts';

/** The `imports` shape `dx-plugin` writes: `#capabilities` sends each runtime to a generated slice. */
const PACKAGE_JSON = {
  name: '@fixture/plugin',
  type: 'module',
  imports: {
    '#capabilities': {
      source: {
        workerd: './src/capabilities/gen/workerd.ts',
        node: './src/capabilities/gen/node.ts',
        browser: './src/capabilities/gen/browser.ts',
      },
      types: './dist/types/src/capabilities/index.d.ts',
      node: './dist/lib/capabilities.node.mjs',
      browser: './dist/lib/capabilities.browser.mjs',
    },
    '#components': {
      source: './src/components/index.ts',
      types: './dist/types/src/components/index.d.ts',
      default: './dist/lib/components.mjs',
    },
    '#meta': {
      source: { browser: './src/gen/meta.ts' },
      types: './dist/types/src/missing.d.ts',
    },
  },
};

describe('createResolver', () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'code-index-resolver-')));
  const write = (path: string, content: string) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  };
  write('plugin/package.json', JSON.stringify(PACKAGE_JSON));
  write('plugin/src/capabilities/index.ts', 'export const Markdown = 1;\n');
  write('plugin/src/components/index.ts', 'export const View = 1;\n');
  write('plugin/src/plugin.ts', "import { Markdown } from '#capabilities';\n");
  const resolve = createResolver(root);

  afterAll(() => rmSync(root, { recursive: true, force: true }));

  test('a conditional source resolves to the barrel its types were emitted from', ({ expect }) => {
    expect(resolve('plugin/src/plugin.ts', '#capabilities')).toEqual(join(root, 'plugin/src/capabilities/index.ts'));
  });

  test('generated slices, gitignored and so never indexed, do not displace the barrel', ({ expect }) => {
    write('plugin/src/capabilities/gen/browser.ts', 'export const Markdown = 1;\n');
    write('plugin/src/capabilities/gen/node.ts', 'export const Markdown = 1;\n');
    expect(resolve('plugin/src/plugin.ts', '#capabilities')).toEqual(join(root, 'plugin/src/capabilities/index.ts'));
  });

  test('a plain source condition still resolves through oxc', ({ expect }) => {
    expect(resolve('plugin/src/plugin.ts', '#components')).toEqual(join(root, 'plugin/src/components/index.ts'));
  });

  test('a fallback whose source module is absent stays unresolved', ({ expect }) => {
    expect(resolve('plugin/src/plugin.ts', '#meta')).toBeUndefined();
    expect(resolve('plugin/src/plugin.ts', '#nowhere')).toBeUndefined();
  });
});
