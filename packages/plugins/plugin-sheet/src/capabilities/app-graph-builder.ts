//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';

import { meta } from '#meta';
import { Sheet } from '#types';

/** Offers "Charts" and "Timeline" companions on every sheet. */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      AppGraphBuilder.createTypeExtension({
        id: 'chartsCompanion',
        relation: AppNode.companion,
        type: Sheet.Sheet,
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              variant: 'charts',
              label: ['charts-companion.label', { ns: meta.profile.key }],
              icon: 'ph--chart-bar--regular',
              data: 'charts',
            }),
          ]),
      }),
      AppGraphBuilder.createTypeExtension({
        id: 'timelineCompanion',
        relation: AppNode.companion,
        type: Sheet.Sheet,
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              variant: 'timeline',
              label: ['timeline-companion.label', { ns: meta.profile.key }],
              icon: 'ph--line-segments--regular',
              data: 'timeline',
            }),
          ]),
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
