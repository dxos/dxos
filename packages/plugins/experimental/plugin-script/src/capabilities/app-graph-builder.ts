//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { ScriptType } from '@dxos/functions';
import { DECK_PLUGIN } from '@dxos/plugin-deck';
import { createExtension, type Node } from '@dxos/plugin-graph';

import { SCRIPT_PLUGIN } from '../meta';

export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${SCRIPT_PLUGIN}/script-logs`,
      filter: (node): node is Node<ScriptType> => node.data instanceof ScriptType,
      connector: ({ node }) => {
        return [
          {
            id: `${SCRIPT_PLUGIN}/script-logs`,
            type: `${DECK_PLUGIN}/companion`,
            data: node.id,
            properties: {
              label: ['script logs label', { ns: SCRIPT_PLUGIN }],
              icon: 'ph--clock-counter-clockwise--regular',
            },
          },
        ];
      },
    }),
  ]);
