//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { findModuleLoaders, wrapModuleBody } from './index.ts';

describe('findModuleLoaders', () => {
  test('finds loaders passed to module makers', ({ expect }) => {
    const code = `
      export const State = Capability.lazyModule('State', { provides: [] }, () => import('./state.ts'));
      export const Surface = AppCapability.surface(() => import('./react-surface.tsx'), { roles: [] });
    `;
    expect(findModuleLoaders('/src/capabilities/index.ts', code)).toEqual(['./state.ts', './react-surface.tsx']);
  });

  test('skips lazy components, plugin entries, assets and non-loader arrows', ({ expect }) => {
    const code = `
      const Panel = lazy(() => import('./Panel.tsx'));
      const Other = React.lazy(() => import('./Other.tsx'));
      export const make = Plugin.lazy(meta, () => import('#plugin'));
      export const Doc = AppCapability.doc({ content: () => import('../../PLUGIN.mdl?raw') });
      register((props) => import('./with-params.ts'));
      register(() => import('./raw.ts?raw'));
    `;
    expect(findModuleLoaders('/src/capabilities/index.ts', code)).toEqual([]);
  });
});

describe('wrapModuleBody', () => {
  test('accepts before the body runs and exports the key', ({ expect }) => {
    const wrapped = wrapModuleBody('export default 1;', '/src/state.ts');
    expect(wrapped.indexOf('import.meta.hot.accept')).toBeLessThan(wrapped.indexOf('export default 1;'));
    expect(wrapped).toContain('export const __dxHotKey = "/src/state.ts";');
    expect(wrapped).toContain('import.meta.hot.invalidate(');
  });
});
