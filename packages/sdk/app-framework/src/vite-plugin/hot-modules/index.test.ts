//
// Copyright 2026 DXOS.org
//

import { parseSync } from 'vite';
import { describe, test } from 'vitest';

import { acceptLoaderTargets, findModuleLoaders as findInProgram, rewriteLoaders, wrapModuleBody } from './index.ts';

const findModuleLoaders = (filename: string, code: string) => findInProgram(parseSync(filename, code).program);

describe('findModuleLoaders', () => {
  test('finds loaders passed to module makers', ({ expect }) => {
    const code = `
      export const State = Capability.lazyModule('State', { provides: [] }, () => import('./state.ts'));
      export const Surface = AppCapability.surface(() => import('./react-surface.tsx'), { roles: [] });
    `;
    expect(findModuleLoaders('/src/capabilities/index.ts', code).map(({ specifier }) => specifier)).toEqual([
      './state.ts',
      './react-surface.tsx',
    ]);
  });

  test('finds plugin definitions loaded by Plugin.lazy', ({ expect }) => {
    const code = `export const make = Plugin.lazy(meta, () => import('#plugin'));`;
    expect(findModuleLoaders('/src/MarkdownPlugin.ts', code).map(({ specifier }) => specifier)).toEqual(['#plugin']);
  });

  test('skips lazy components, dependencies, assets and non-loader arrows', ({ expect }) => {
    const code = `
      const Panel = lazy(() => import('./Panel.tsx'));
      const Other = React.lazy(() => import('./Other.tsx'));
      register(() => import('some-package'));
      export const Doc = AppCapability.doc({ content: () => import('../../PLUGIN.mdl?raw') });
      register((props) => import('./with-params.ts'));
      register(() => import('./raw.ts?raw'));
    `;
    expect(findModuleLoaders('/src/capabilities/index.ts', code)).toEqual([]);
  });
});

describe('rewriteLoaders', () => {
  test('resolves each loader to the newest version of its body', ({ expect }) => {
    const code = `a(() => import('./a.ts')); b(() => import('./b.ts'));`;
    const rewritten = rewriteLoaders(code, findModuleLoaders('/src/index.ts', code));
    expect(rewritten).toBe(
      "a(() => import('./a.ts').then((module) => globalThis.__DX_HOT_MODULES__?.latest(module) ?? module)); " +
        "b(() => import('./b.ts').then((module) => globalThis.__DX_HOT_MODULES__?.latest(module) ?? module));",
    );
  });
});

describe('acceptLoaderTargets', () => {
  test('accepts each loaded file once, on the first line', ({ expect }) => {
    const code = `a(() => import('./a.ts'));\nb(() => import('./a.ts'));\nc(() => import('./c.ts'));`;
    const accepted = acceptLoaderTargets(code, findModuleLoaders('/src/index.ts', code));
    const [first, ...rest] = accepted.split('\n');
    expect(first).toMatch(/^if \(import\.meta\.hot\) \{ import\.meta\.hot\.accept\(\["\.\/a\.ts","\.\/c\.ts"\]/);
    expect(first.endsWith("a(() => import('./a.ts'));")).toBe(true);
    expect(rest).toEqual(code.split('\n').slice(1));
  });

  test('leaves a file without loaders unchanged', ({ expect }) => {
    expect(acceptLoaderTargets('export const x = 1;', [])).toBe('export const x = 1;');
  });
});

describe('wrapModuleBody', () => {
  test('accepts before the body runs, keeps its line numbers and exports the key', ({ expect }) => {
    const body = 'import x from "x";\nexport default 1;';
    const wrapped = wrapModuleBody(body, '/src/state.ts');
    const lines = wrapped.split('\n');
    expect(lines[0]).toMatch(/^if \(import\.meta\.hot\).*import x from "x";$/);
    expect(lines[1]).toBe('export default 1;');
    expect(wrapped).toContain('export const __dxHotKey = "/src/state.ts";');
    expect(wrapped).toContain('import.meta.hot.invalidate(');
  });
});
