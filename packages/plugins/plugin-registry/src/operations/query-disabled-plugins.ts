//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Plugin from '@dxos/app-framework/Plugin';
import * as Operation from '@dxos/compute/Operation';

import { QueryDisabledPlugins } from './definitions';

const handler: Operation.WithHandler<typeof QueryDisabledPlugins> = QueryDisabledPlugins.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const manager = yield* Plugin.Service;
      const core = new Set(manager.getCore());
      const enabled = new Set(manager.getEnabled());
      const plugins = manager
        .getPlugins()
        .filter((plugin) => !enabled.has(plugin.meta.profile.key))
        .map((plugin) => ({
          id: plugin.meta.profile.key,
          name: plugin.meta.profile.name,
          description: plugin.meta.profile.description,
          core: core.has(plugin.meta.profile.key),
          enabled: false,
          active: false,
        }));

      return { plugins };
    }),
  ),
);

export default handler;
