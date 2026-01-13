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

  const plugins = manager.getPlugins();
  const plugin = plugins.find((p: Plugin.Plugin) => p.meta.id === id);
  invariant(plugin, `Plugin not found: ${id}`);

  const core = manager.getCore();
  invariant(!core.includes(id), `Cannot disable core plugin: ${id}`);

  const disabled = yield* manager.disable(id);
  invariant(disabled, `Failed to disable plugin: ${id}`);

  // Save enabled plugins to storage
  const enabledPlugins = manager.getEnabled();
  yield* saveEnabledPlugins({ profile, enabled: [...enabledPlugins] });

  if (json) {
    yield* Console.log(JSON.stringify({ id, enabled: false }, null, 2));
  } else {
    yield* Console.log(`Plugin "${plugin.meta.name ?? id}" disabled.`);
  }
});

export const disable = Command.make(
  'disable',
  {
    id: Args.text({ name: 'id' }).pipe(Args.withDescription('The ID of the plugin to disable.')),
  },
  handler,
).pipe(Command.withDescription('Disable a plugin.'));
