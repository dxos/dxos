//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { generate } from './generate.ts';

/**
 * Writes a throwaway plugin package and runs the generator over it. File-in/file-out is the whole
 * contract, so the fixtures are the cheapest place to pin behaviour the 95-plugin migration cannot
 * exercise: a value export beside a module, a re-export, a UI-family stub.
 */
const withPlugin = (files: Record<string, string>, assert: (dir: string) => void): void => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dx-plugin-gen-'));
  try {
    for (const [relative, contents] of Object.entries(files)) {
      const target = path.join(dir, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, contents);
    }
    assert(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

const PACKAGE_JSON = JSON.stringify(
  {
    name: '@dxos/plugin-fixture',
    version: '0.0.0',
    imports: {
      '#capabilities': {
        source: './src/capabilities/index.ts',
        types: './dist/types/src/capabilities/index.d.ts',
        default: './dist/lib/capabilities.mjs',
      },
    },
  },
  null,
  2,
);

const read = (dir: string, env: string): string =>
  fs.readFileSync(path.join(dir, 'src/capabilities/gen', `${env}.ts`), 'utf8');

describe('dx-plugin gen', () => {
  it('carries a value export into every generated barrel', () => {
    // Regression: value exports were classified as `non-call-initializer` and then filtered out
    // entirely — neither sliced nor stubbed — so the generated barrel silently exported less than
    // the canonical one. `#capabilities.types` always points at the canonical declaration, so the
    // type checker cannot see the difference; only a consumer importing under that condition can.
    withPlugin(
      {
        'package.json': PACKAGE_JSON,
        'src/capabilities/index.ts': [
          "import * as Capability from '@dxos/app-framework/Capability';",
          '',
          'export const SHARED_ID = 3;',
          "export const Headless = Capability.lazyModule('Headless', { environments: ['node'] }, () => import('./headless'));",
          '',
        ].join('\n'),
      },
      (dir) => {
        const result = generate(dir);
        expect(result.environments).toEqual(['node']);
        expect(result.files[0].values).toEqual(1);

        const node = read(dir, 'node');
        expect(node).toContain('export const SHARED_ID = 3;');
        expect(node).toContain("Capability.lazyModule('Headless'");
      },
    );
  });

  it('stubs an excluded module rather than dropping it', () => {
    withPlugin(
      {
        'package.json': PACKAGE_JSON,
        'src/capabilities/index.ts': [
          "import * as Capability from '@dxos/app-framework/Capability';",
          '',
          "export const Headless = Capability.lazyModule('Headless', { environments: ['node'] }, () => import('./headless'));",
          "export const BrowserOnly = Capability.lazyModule('BrowserOnly', { environments: [] }, () => import('./ui'));",
          '',
        ].join('\n'),
      },
      (dir) => {
        const result = generate(dir);
        expect(result.files[0].included).toEqual(1);
        expect(result.files[0].stubbed).toEqual(1);

        const node = read(dir, 'node');
        // The stub has to exist: `Plugin.addModule` skips `undefined`, and an absent export would
        // be a resolution error in the canonical entry instead.
        expect(node).toContain('export const BrowserOnly = undefined;');
        expect(node).not.toContain("import('./ui')");
      },
    );
  });

  it('resolves a member re-exported from another file', () => {
    withPlugin(
      {
        'package.json': PACKAGE_JSON,
        'src/capabilities/index.ts': [
          "export { Headless } from './headless-module';",
          "export { helper } from '../util';",
          '',
        ].join('\n'),
        'src/capabilities/headless-module.ts': [
          "import * as Capability from '@dxos/app-framework/Capability';",
          '',
          "export const Headless = Capability.lazyModule('Headless', { environments: ['node'] }, () => import('./headless'));",
          '',
        ].join('\n'),
        'src/util.ts': ['export const helper = () => 1;', ''].join('\n'),
      },
      (dir) => {
        const result = generate(dir);
        expect(result.environments).toEqual(['node']);

        const node = read(dir, 'node');
        expect(node).toContain("Capability.lazyModule('Headless'");
        // The re-exported helper lives two directories up from `gen/`; it must be carried, not lost.
        expect(node).toContain('export const helper');
      },
    );
  });

  it('generates nothing when no module names a condition', () => {
    withPlugin(
      {
        'package.json': PACKAGE_JSON,
        'src/capabilities/index.ts': [
          "import * as Capability from '@dxos/app-framework/Capability';",
          '',
          "export const Isomorphic = Capability.lazyModule('Isomorphic', {}, () => import('./iso'));",
          '',
        ].join('\n'),
      },
      (dir) => {
        const result = generate(dir);
        expect(result.environments).toEqual([]);
        expect(result.files).toEqual([]);
        expect(fs.existsSync(path.join(dir, 'src/capabilities/gen'))).toBe(false);
      },
    );
  });

  it('rejects a computed environments value instead of guessing', () => {
    withPlugin(
      {
        'package.json': PACKAGE_JSON,
        'src/capabilities/index.ts': [
          "import * as Capability from '@dxos/app-framework/Capability';",
          '',
          "const envs = ['node'];",
          "export const Headless = Capability.lazyModule('Headless', { environments: envs }, () => import('./headless'));",
          '',
        ].join('\n'),
      },
      (dir) => {
        expect(() => generate(dir)).toThrow(/literal array/);
      },
    );
  });
});
