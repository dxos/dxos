//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import * as Position from '@dxos/util/Position';

import { DoctorNamespace } from '../namespace.ts';

export const DIAGNOSTICS_DECK_COMPANION_ID = 'diagnostics';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      AppGraphBuilder.createExtension({
        id: `${DoctorNamespace.key}.diagnosticsDeckCompanion`,
        relation: AppNode.companion,
        match: GraphNodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            AppNode.makeDeckCompanion({
              id: DIAGNOSTICS_DECK_COMPANION_ID,
              label: ['diagnostics-tab.label', { ns: DoctorNamespace.key }],
              icon: 'ph--first-aid-kit--regular',
              data: DIAGNOSTICS_DECK_COMPANION_ID,
              position: Position.last,
            }),
          ]),
      }),
    ]);
    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
