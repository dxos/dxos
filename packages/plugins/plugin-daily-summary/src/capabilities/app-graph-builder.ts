//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { meta as spaceMeta } from '@dxos/plugin-space/meta';

import { meta } from '#meta';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: `${meta.id}.space-settings-daily-summary`,
        match: NodeMatcher.whenNodeType(`${spaceMeta.id}.settings`),
        connector: (node) =>
          Effect.succeed([
            {
              id: `${meta.id}.daily-summary`,
              type: `${meta.id}.space-settings-daily-summary`,
              data: `${meta.id}.space-settings-daily-summary`,
              properties: {
                label: ['plugin.name', { ns: meta.id }],
                icon: 'ph--calendar-check--regular',
              },
            },
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
