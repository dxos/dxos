//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { ScriptType } from '@dxos/functions';
import { COMPANION_TYPE, SLUG_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { createExtension, type Node } from '@dxos/plugin-graph';

import { SCRIPT_PLUGIN } from '../meta';

export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${SCRIPT_PLUGIN}/execute`,
      filter: (node): node is Node<ScriptType> => isInstanceOf(ScriptType, node.data),
      connector: ({ node }) => [
        {
          // TODO(burdon): Return [node.id, SLUG_PATH_SEPARATOR, 'execute'].
          id: `${node.id}${SLUG_PATH_SEPARATOR}execute`,
          type: COMPANION_TYPE,
          data: node.data,
          properties: {
            label: ['script execute label', { ns: SCRIPT_PLUGIN }],
            icon: 'ph--terminal--regular',
          },
        },
      ],
    }),
    createExtension({
      id: `${SCRIPT_PLUGIN}/logs`,
      filter: (node): node is Node<ScriptType> => isInstanceOf(ScriptType, node.data),
      connector: ({ node }) => [
        {
          id: `${node.id}${SLUG_PATH_SEPARATOR}logs`,
          type: COMPANION_TYPE,
          data: node.data,
          properties: {
            label: ['script logs label', { ns: SCRIPT_PLUGIN }],
            icon: 'ph--clock-countdown--regular',
          },
        },
      ],
    }),
  ]);
