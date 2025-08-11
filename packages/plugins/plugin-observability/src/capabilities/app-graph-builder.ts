//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { Option, pipe } from 'effect';

import { Capabilities, type PluginContext, contributes } from '@dxos/app-framework';
import { ROOT_ID, createExtension } from '@dxos/plugin-graph';

import { OBSERVABILITY_PLUGIN } from '../meta';

// NOTE: Copied from @dxos/plugin-deck to break circular dependency.
const ATTENDABLE_PATH_SEPARATOR = '~';
const DECK_COMPANION_TYPE = 'dxos.org/plugin/deck/deck-companion';

export default (context: PluginContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${OBSERVABILITY_PLUGIN}/help`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (node.id === ROOT_ID ? Option.some(node) : Option.none())),
            Option.map((node) => {
              return [
                {
                  id: [node.id, 'help'].join(ATTENDABLE_PATH_SEPARATOR),
                  type: DECK_COMPANION_TYPE,
                  data: null,
                  properties: {
                    label: ['help label', { ns: OBSERVABILITY_PLUGIN }],
                    icon: 'ph--question--regular',
                    disposition: 'hidden',
                    position: 'hoist',
                  },
                },
              ];
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  ]);
