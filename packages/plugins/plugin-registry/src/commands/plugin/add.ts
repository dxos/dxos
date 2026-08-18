//
// Copyright 2026 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Args from 'effect/unstable/cli/Argument';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';

import * as Plugin from '@dxos/app-framework/Plugin';
import { CommandConfig } from '@dxos/cli-util';

import { type PluginRecord, loadPlugins, savePlugins } from '../../storage';
import { PluginInstallError, downloadAssets, resolveLocator } from '../../util';

export const handler = Effect.fn(function* ({
  locator,
  dev,
  enable,
}: {
  locator: string;
  dev: boolean;
  enable: boolean;
}) {
  const { json, profile } = yield* CommandConfig;
  const manager = yield* Plugin.Service;

  const { record, assets, manifest } = yield* resolveLocator(locator, { dev });

  // A third-party plugin claiming a compiled-in id would make the builtin permanently
  // unreachable. `--dev` is allowed to collide because that is what overriding a builtin while
  // developing it means, and the manager restores the original when the dev install is removed.
  if (!dev && manager.getPlugins().some((plugin) => plugin.meta.profile.key === record.id)) {
    return yield* Effect.fail(
      new PluginInstallError({
        message: `Plugin "${record.id}" is already provided by this CLI. Use --dev to override it while developing.`,
        context: { locator, reason: 'duplicate-id' },
      }),
    );
  }

  if (record.source?.kind === 'copy') {
    yield* downloadAssets({ id: record.id, baseUrl: record.source.origin, assets, manifest });
  }

  const existing = (yield* loadPlugins({ profile })) ?? [];
  const enabled = enable || existing.some((entry) => entry.id === record.id && entry.enabled !== false);
  const installed: PluginRecord = { ...record, enabled };
  yield* savePlugins({
    profile,
    plugins: [...existing.filter((entry) => entry.id !== record.id), installed],
    core: manager.getCore(),
  });

  if (json) {
    yield* Console.log(JSON.stringify(installed, null, 2));
  } else {
    // The user typed a locator but every other verb takes an id, so the id is the useful output.
    yield* Console.log(
      `Installed "${record.meta?.name ?? record.id}" as ${record.id}${enabled ? ' (enabled).' : ' (disabled — run `dx plugin enable` to turn it on).'}`,
    );
  }
});

export const add = Command.make(
  'add',
  {
    locator: Args.string('locator').pipe(
      Args.withDescription('Manifest URL to install from, or a directory to install with --dev.'),
    ),
    dev: Options.boolean('dev').pipe(
      Options.withDescription('Read the plugin in place from a directory, overriding a builtin of the same id.'),
    ),
    enable: Options.boolean('enable').pipe(
      Options.withDefault(true),
      Options.withDescription('Enable the plugin after installing it.'),
    ),
  },
  handler,
).pipe(Command.withDescription('Install a plugin from a URL or a local directory.'));
