//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { ScriptType } from '@dxos/functions';
import { COMPANION_TYPE, ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { createExtension, type Node } from '@dxos/plugin-graph';
import { SCRIPT_PLUGIN } from '@dxos/plugin-script/types';

import { meta } from '../meta';

export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${SCRIPT_PLUGIN}/automation`,
      filter: (node): node is Node<ScriptType> => isInstanceOf(ScriptType, node.data),
      connector: ({ node }) => [
        {
          id: [node.id, 'automation'].join(ATTENDABLE_PATH_SEPARATOR),
          type: COMPANION_TYPE,
          data: node.data,
          properties: {
            label: ['script automation label', { ns: meta.id }],
            icon: 'ph--lightning--regular',
          },
        },
      ],
    }),
  ]);
