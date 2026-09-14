//
// Copyright 2025 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Args from 'effect/unstable/cli/Argument';
import * as Command from 'effect/unstable/cli/Command';

import * as Plugin from '@dxos/app-framework/Plugin';
import { CommandConfig } from '@dxos/cli-util';

import { saveEnabledPlugins } from '../../storage.ts';
import { CorePluginError, PluginNotFoundError } from './errors.ts';

export const handler = Effect.fn(function* ({ id }: { id: string }) {
  const { json, profile } = yield* CommandConfig;
  const manager = yield* Plugin.Service;

  const plugins = manager.getPlugins();
  const plugin = plugins.find((p: Plugin.Plugin) => p.meta.profile.key === id);
  if (!plugin) {
    return yield* Effect.fail(new PluginNotFoundError(id));
  }
  if (manager.getCore().includes(id)) {
    return yield* Effect.fail(new CorePluginError(id));
  }

  // Idempotent for the same reason `enable` is.
  if (manager.getEnabled().includes(id)) {
    yield* manager.disable(id);
    yield* saveEnabledPlugins({
      profile,
      enabled: [...manager.getEnabled()],
      registered: plugins.map((plugin: Plugin.Plugin) => plugin.meta.profile.key),
      core: manager.getCore(),
    });
  }

  if (json) {
    yield* Console.log(JSON.stringify({ id, enabled: false }, null, 2));
  } else {
    yield* Console.log(`Plugin "${plugin.meta.profile.name ?? id}" disabled.`);
  }
});

export const disable = Command.make(
  'disable',
  {
    id: Args.string('id').pipe(Args.withDescription('The ID of the plugin to disable.')),
  },
  handler,
).pipe(Command.withDescription('Disable a plugin.'));
