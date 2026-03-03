//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';

import { meta } from '../../meta';

// NOTE: Copied from @dxos/plugin-deck to break circular dependency.
const ATTENDABLE_PATH_SEPARATOR = '~';

const DECK_COMPANION_TYPE = 'dxos.org/plugin/deck/deck-companion';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: `${meta.id}/help`,
        match: NodeMatcher.whenRoot,
        connector: (node) =>
          Effect.succeed([
            {
              id: [node.id, 'help'].join(ATTENDABLE_PATH_SEPARATOR),
              type: DECK_COMPANION_TYPE,
              data: null,
              properties: {
                label: ['help label', { ns: meta.id }],
                icon: 'ph--question--regular',
                disposition: 'hidden',
                position: 'hoist',
              },
            },
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
