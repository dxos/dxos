//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, AppNodeMatcher } from '@dxos/app-toolkit';
import { GraphBuilder } from '@dxos/plugin-graph';

import { meta } from '#meta';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'space-settings-daily-summary',
        match: AppNodeMatcher.whenSpace,
        connector: () =>
          Effect.succeed([
            AppNode.makeSettingsPanel({
              id: 'daily-summary',
              type: `${meta.id}.space-settings-daily-summary`,
              label: ['plugin.name', { ns: meta.id }],
              icon: 'ph--calendar-check--regular',
            }),
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
