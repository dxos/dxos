//
// Copyright 2025 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';

import * as Plugin from '@dxos/app-framework/Plugin';
import { CommandConfig, printList } from '@dxos/cli-util';

import { type FormattedPlugin, getPluginStatus, printPlugin } from './util';

export const handler = Effect.fn(function* ({ enabled: enabledOnly }: { enabled: boolean }) {
  const { json } = yield* CommandConfig;
  const manager = yield* Plugin.Service;

  const plugins = manager.getPlugins();
  const enabled = manager.getEnabled();
  const core = manager.getCore();
  const failures = new Map(manager.getFailed().map((failure) => [failure.id, failure]));

  const formattedPlugins: FormattedPlugin[] = plugins
    .map((plugin: Plugin.Plugin) => {
      const id = plugin.meta.profile.key;
      const failure = failures.get(id);
      return {
        id,
        name: plugin.meta.profile.name ?? id,
        // Every plugin the manager knows about is installed; the axis only starts carrying
        // information once plugins can arrive from a URL rather than the binary.
        installed: true,
        enabled: enabled.includes(id),
        core: core.includes(id),
        ...(failure ? { failure: failure.error.message } : {}),
      };
    })
    .filter((plugin) => !enabledOnly || plugin.enabled);

  if (json) {
    yield* Console.log(
      JSON.stringify(
        formattedPlugins.map((plugin) => ({ ...plugin, status: getPluginStatus(plugin) })),
        null,
        2,
      ),
    );
  } else {
    const formatted = formattedPlugins.map(printPlugin);
    yield* Console.log(printList(formatted));
  }
});

export const list = Command.make(
  'list',
  {
    enabled: Options.boolean('enabled').pipe(Options.withDescription('Only list enabled plugins.')),
  },
  handler,
).pipe(Command.withDescription('List all available plugins.'));
