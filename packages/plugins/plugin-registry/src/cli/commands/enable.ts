//
// Copyright 2025 DXOS.org
//

import * as Args from '@effect/cli/Args';
import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { type Plugin, PluginManager } from '@dxos/app-framework';
import { CommandConfig } from '@dxos/cli-util';
import { invariant } from '@dxos/invariant';

import { saveEnabledPlugins } from '../storage';

export const handler = Effect.fn(function* ({ id }: { id: string }) {
  const { json, profile } = yield* CommandConfig;
  const manager = yield* PluginManager.Service;

  const plugins = manager.plugins;
  const plugin = plugins.find((p: Plugin.Plugin) => p.meta.id === id);
  invariant(plugin, `Plugin not found: ${id}`);

  const enabled = yield* Effect.promise(() => manager.enable(id));
  invariant(enabled, `Failed to enable plugin: ${id}`);

  // Save enabled plugins to storage
  const enabledPlugins = manager.enabled;
  yield* saveEnabledPlugins({ profile, enabled: [...enabledPlugins] });

  if (json) {
    yield* Console.log(JSON.stringify({ id, enabled: true }, null, 2));
  } else {
    yield* Console.log(`Plugin "${plugin.meta.name ?? id}" enabled.`);
  }
});

export const enable = Command.make(
  'enable',
  {
    id: Args.text({ name: 'id' }).pipe(Args.withDescription('The ID of the plugin to enable.')),
  },
  handler,
).pipe(Command.withDescription('Enable a plugin.'));
