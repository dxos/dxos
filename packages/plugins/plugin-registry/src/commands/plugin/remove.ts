//
// Copyright 2026 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Args from 'effect/unstable/cli/Argument';
import * as Command from 'effect/unstable/cli/Command';

import * as Plugin from '@dxos/app-framework/Plugin';
import { CommandConfig } from '@dxos/cli-util';

import { loadPlugins, savePlugins } from '../../storage';
import { removeAssets } from '../../util';
import { PluginNotFoundError, PluginNotRemovableError } from './errors';

export const handler = Effect.fn(function* ({ id }: { id: string }) {
  const { json, profile } = yield* CommandConfig;
  const manager = yield* Plugin.Service;

  const existing = (yield* loadPlugins({ profile })) ?? [];
  const record = existing.find((entry) => entry.id === id && entry.source !== undefined);
  if (!record) {
    // A compiled-in plugin exists but has nothing to uninstall — point at the verb that does apply
    // rather than reporting it missing.
    return yield* Effect.fail(
      manager.getPlugins().some((plugin) => plugin.meta.profile.key === id)
        ? new PluginNotRemovableError(id)
        : new PluginNotFoundError(id),
    );
  }

  // Only a copy owns bytes under `plugins/<id>/`; a link is the user's directory and is left alone.
  if (record.source?.kind === 'copy') {
    yield* removeAssets(id);
  }
  yield* savePlugins({
    profile,
    plugins: existing.filter((entry) => entry.id !== id),
    core: manager.getCore(),
  });

  if (json) {
    yield* Console.log(JSON.stringify({ id, removed: true, kind: record.source?.kind }, null, 2));
  } else {
    yield* Console.log(
      record.source?.kind === 'copy'
        ? `Removed "${record.meta?.name ?? id}" and deleted its files.`
        : `Removed "${record.meta?.name ?? id}". Its directory was left in place.`,
    );
  }
});

export const remove = Command.make(
  'remove',
  {
    id: Args.string('id').pipe(Args.withDescription('The ID of the plugin to remove.')),
  },
  handler,
).pipe(Command.withDescription('Uninstall a plugin.'));
