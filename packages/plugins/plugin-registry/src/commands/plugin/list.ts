//
// Copyright 2025 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';

import * as Plugin from '@dxos/app-framework/Plugin';
import { CommandConfig, printList } from '@dxos/cli-util';

import { loadPlugins } from '../../storage';
import { type FormattedPlugin, getLoadFailure, getPluginStatus, printPlugin } from '../../util';

export const handler = Effect.fn(function* ({ enabled: enabledOnly }: { enabled: boolean }) {
  const { json, profile } = yield* CommandConfig;
  const manager = yield* Plugin.Service;

  const plugins = manager.getPlugins();
  const enabled = manager.getEnabled();
  const core = manager.getCore();
  const failures = new Map(manager.getFailed().map((failure) => [failure.id, failure]));
  const records = new Map(((yield* loadPlugins({ profile })) ?? []).map((record) => [record.id, record]));

  const formattedPlugins: FormattedPlugin[] = plugins
    .map((plugin: Plugin.Plugin): FormattedPlugin => {
      const id = plugin.meta.profile.key;
      // A plugin whose module failed to import is degraded to an empty plugin so the CLI still
      // runs; without this it would list as healthy while contributing nothing.
      const failure = failures.get(id)?.error ?? getLoadFailure(id);
      const source = records.get(id)?.source;
      return {
        id,
        name: plugin.meta.profile.name ?? id,
        installed: true,
        enabled: enabled.includes(id),
        core: core.includes(id),
        source: source ? (source.kind === 'copy' ? 'url' : 'dev') : 'builtin',
        ...(source?.kind === 'copy' && source.version ? { version: source.version } : {}),
        ...(failure ? { failure: failure.message } : {}),
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
