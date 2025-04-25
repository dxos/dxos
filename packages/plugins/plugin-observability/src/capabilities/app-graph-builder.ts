//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { createExtension, type Node } from '@dxos/plugin-graph';

import { OBSERVABILITY_PLUGIN } from '../meta';

// NOTE: Copied from @dxos/plugin-deck to break circular dependency.
const ATTENDABLE_PATH_SEPARATOR = '~';
const DECK_COMPANION_TYPE = 'dxos.org/plugin/deck/deck-companion';

export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${OBSERVABILITY_PLUGIN}/help`,
      filter: (node): node is Node<null> => node.id === 'root',
      connector: ({ node }) => [
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
      ],
    }),
  ]);
