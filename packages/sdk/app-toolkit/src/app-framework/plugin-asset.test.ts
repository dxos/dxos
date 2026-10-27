//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as PluginManager from '@dxos/app-framework/PluginManager';
import * as EffectEx from '@dxos/effect/EffectEx';

import * as AppCapabilities from './AppCapabilities.ts';
import * as AppCapability from './AppCapability.ts';

describe('pluginAsset', () => {
  test('loads and contributes the asset only once it is requested', async ({ expect }) => {
    let loads = 0;
    const key = 'org.example.spec';
    const plugin = Plugin.define({ profile: { key, name: 'Spec' } }).pipe(
      Plugin.addModule(
        AppCapability.pluginAsset({
          pluginId: key,
          path: 'PLUGIN.mdl',
          mimeType: 'application/x-mdl',
          content: async () => {
            loads++;
            return { default: '# Spec' };
          },
        }),
      ),
      Plugin.make,
    )();
    const manager = PluginManager.make({
      pluginLoader: (id) => Effect.die(`unexpected load: ${id}`),
      plugins: [plugin],
      enabled: [key],
    });

    await EffectEx.runPromise(manager.start());
    expect(loads).toBe(0);
    expect(manager.capabilities.getAll(AppCapabilities.PluginAsset)).toEqual([]);

    await EffectEx.runPromise(manager.activate(ActivationEvents.PluginAssetsRequested).pipe(Effect.asVoid));
    expect(loads).toBe(1);
    expect(manager.capabilities.getAll(AppCapabilities.PluginAsset)).toEqual([
      { pluginId: key, path: 'PLUGIN.mdl', mimeType: 'application/x-mdl', content: '# Spec' },
    ]);
  });
});
