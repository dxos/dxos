//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Plugin from '@dxos/app-framework/Plugin';
import * as Operation from '@dxos/compute/Operation';

import { QueryPlugins } from './definitions.ts';

const handler: Operation.WithHandler<typeof QueryPlugins> = QueryPlugins.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ enabled: enabledOnly }) {
      const manager = yield* Plugin.Service;
      const core = new Set(manager.getCore());
      const enabled = new Set(manager.getEnabled());
      const active = new Set(manager.getActive());
      const plugins = manager.getPlugins().flatMap((plugin) => {
        const id = plugin.meta.profile.key;
        if (enabledOnly && !enabled.has(id)) {
          return [];
        }
        return [
          {
            id,
            name: plugin.meta.profile.name,
            description: plugin.meta.profile.description,
            core: core.has(id),
            enabled: enabled.has(id),
            // Enabled is a choice, active is a fact: a plugin contributes nothing until one of its
            // modules activates, so an operation it registers is absent from this host until then.
            active: plugin.modules.some((module) => active.has(module.id)),
          },
        ];
      });
      return { plugins };
    }),
  ),
);

export default handler;
