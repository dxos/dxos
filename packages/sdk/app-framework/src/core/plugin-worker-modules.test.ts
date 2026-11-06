//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DXN } from '@dxos/keys';

import * as Plugin from './plugin.ts';

const workerModule = (id: string): Plugin.WorkerModule => ({
  id,
  url: `https://example.com/${id}.mjs`,
  requires: [],
  provides: [],
});

const lazyPlugin = (
  key: string,
  { tags, dependsOn, modules = [] }: { tags?: string[]; dependsOn?: string[]; modules?: string[] } = {},
): Plugin.Plugin =>
  Plugin.lazy(
    Plugin.makeMeta({ key: DXN.make(key), name: key, tags, dependsOn }),
    (): Promise<{ default: Plugin.PluginFactory }> => Promise.reject(new Error('not loaded')),
    { workerModules: modules.map(workerModule) },
  )();

describe('worker modules', () => {
  test('a lazy stub carries the worker modules its build recorded', ({ expect }) => {
    const plugin = lazyPlugin('org.dxos.test.a', { modules: ['Services'] });
    expect(Plugin.getWorkerModules(plugin).map(({ id }) => id)).toEqual(['Services']);
    expect(Plugin.getWorkerModules(lazyPlugin('org.dxos.test.b'))).toEqual([]);
  });

  test('startup modules cover core, enabled and their dependencies only', ({ expect }) => {
    const plugins = [
      lazyPlugin('org.dxos.test.core', { tags: ['system'], modules: ['Core'] }),
      lazyPlugin('org.dxos.test.enabled', { dependsOn: ['org.dxos.test.dep'], modules: ['Enabled'] }),
      lazyPlugin('org.dxos.test.dep', { modules: ['Dep'] }),
      lazyPlugin('org.dxos.test.disabled', { modules: ['Disabled'] }),
    ];
    const modules = Plugin.getStartupWorkerModules(plugins, ['org.dxos.test.enabled']);
    expect(modules.map(({ plugin, id }) => `${plugin}/${id}`).sort()).toEqual([
      'org.dxos.test.core/Core',
      'org.dxos.test.dep/Dep',
      'org.dxos.test.enabled/Enabled',
    ]);
  });
});
