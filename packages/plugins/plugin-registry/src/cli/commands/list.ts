//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { type Plugin, PluginService } from '@dxos/app-framework';
import { CommandConfig, printList } from '@dxos/cli-util';

import { type FormattedPlugin, printPlugin } from './util';

export const handler = Effect.fn(function* () {
  const { json } = yield* CommandConfig;
  const manager = yield* PluginService;

  const plugins = manager.plugins;
  const enabled = manager.enabled;
  const core = manager.core;

  const formattedPlugins: FormattedPlugin[] = plugins.map((plugin: Plugin) => {
    const isEnabled = enabled.includes(plugin.meta.id);
    const isCore = core.includes(plugin.meta.id);
    return {
      id: plugin.meta.id,
      name: plugin.meta.name ?? plugin.meta.id,
      enabled: isEnabled,
      core: isCore,
    };
  });

  if (json) {
    yield* Console.log(JSON.stringify(formattedPlugins, null, 2));
  } else {
    const formatted = formattedPlugins.map(printPlugin);
    yield* Console.log(printList(formatted));
  }
});

export const list = Command.make('list', {}, handler).pipe(Command.withDescription('List all available plugins.'));
