//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as Plugin from '@dxos/app-framework/Plugin';
import * as PluginManager from '@dxos/app-framework/PluginManager';
import { EffectEx } from '@dxos/effect';

import { pluginSet } from './binding.ts';

const makePlugin = (key: string, dependsOn?: string[]) =>
  Plugin.make(Plugin.define({ profile: { key, name: key, dependsOn } }))();

describe('pluginSet', () => {
  test('a synced decision does not turn off what a dev plugin depends on', async ({ expect }) => {
    const map = makePlugin('org.example.map');
    const clock = makePlugin('org.example.clock', ['org.example.map']);
    const manager = PluginManager.make({
      plugins: [map],
      // Loads the dev plugin, as Plugins → Dev Server does from its manifest URL.
      pluginLoader: () => Effect.succeed({ plugin: clock, dev: true }),
    });
    await EffectEx.runPromise(
      Effect.gen(function* () {
        const plugin = yield* manager.add('http://localhost:3967/manifest.json');
        yield* manager.enable(plugin.meta.profile.key);
      }),
    );
    expect(manager.getEnabled()).toEqual(expect.arrayContaining(['org.example.map', 'org.example.clock']));

    const binding = pluginSet(manager, manager.registry);
    // The account's decisions, from a device where the map plugin was never turned on.
    await binding.write({ 'org.example.map': false });
    expect(manager.getEnabled()).toEqual(expect.arrayContaining(['org.example.map', 'org.example.clock']));
    // Nor does this session's dev plugin become the account's decision.
    expect(binding.read()).toEqual({});
  });
});
