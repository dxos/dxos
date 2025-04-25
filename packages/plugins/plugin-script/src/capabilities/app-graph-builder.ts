//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { ScriptType } from '@dxos/functions';
import { COMPANION_TYPE, ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { createExtension, type Node } from '@dxos/plugin-graph';

import { meta } from '../meta';

export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    // TOOD(burdon): Factor out: make generic?
    createExtension({
      id: `${meta.id}/settings`,
      filter: (node): node is Node<ScriptType> => isInstanceOf(ScriptType, node.data),
      connector: ({ node }) => [
        {
          id: [node.id, 'settings'].join(ATTENDABLE_PATH_SEPARATOR),
          type: COMPANION_TYPE,
          data: node.data,
          properties: {
            label: ['script settings label', { ns: meta.id }],
            icon: 'ph--sliders--regular',
            disposition: 'hidden',
          },
        },
      ],
    }),
    createExtension({
      id: `${meta.id}/execute`,
      filter: (node): node is Node<ScriptType> => isInstanceOf(ScriptType, node.data),
      connector: ({ node }) => [
        {
          id: [node.id, 'execute'].join(ATTENDABLE_PATH_SEPARATOR),
          type: COMPANION_TYPE,
          // TODO(burdon): Shouldn't require the primary node data.
          data: node.data,
          properties: {
            label: ['script test label', { ns: meta.id }],
            icon: 'ph--terminal--regular',
            disposition: 'hidden',
          },
        },
      ],
    }),
    createExtension({
      id: `${meta.id}/logs`,
      filter: (node): node is Node<ScriptType> => isInstanceOf(ScriptType, node.data),
      connector: ({ node }) => [
        {
          id: [node.id, 'logs'].join(ATTENDABLE_PATH_SEPARATOR),
          type: COMPANION_TYPE,
          data: node.data,
          properties: {
            label: ['script logs label', { ns: meta.id }],
            icon: 'ph--clock-countdown--regular',
            disposition: 'hidden',
          },
        },
      ],
    }),
  ]);
