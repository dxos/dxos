//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { ScriptType } from '@dxos/functions';
import { PLANK_COMPANION_TYPE, ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { createExtension, type Node } from '@dxos/plugin-graph';
import { SCRIPT_PLUGIN } from '@dxos/plugin-script/types';
import { SPACE_PLUGIN } from '@dxos/plugin-space';
import { type Space } from '@dxos/react-client/echo';

import { meta } from '../meta';

export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${meta.id}/space-settings-automation`,
      filter: (node): node is Node<Space> => node.type === `${SPACE_PLUGIN}/settings`,
      connector: ({ node }) => [
        {
          id: `automation-${node.id}`,
          type: `${meta.id}/space-settings-automation`,
          data: `${meta.id}/space-settings-automation`,
          properties: {
            label: ['automation panel label', { ns: meta.id }],
            icon: 'ph--lightning--regular',
          },
        },
      ],
    }),
    createExtension({
      id: `${meta.id}/space-settings-functions`,
      filter: (node): node is Node<Space> => node.type === `${SPACE_PLUGIN}/settings`,
      connector: ({ node }) => [
        {
          id: `functions-${node.id}`,
          type: `${meta.id}/space-settings-functions`,
          data: `${meta.id}/space-settings-functions`,
          properties: {
            label: ['functions panel label', { ns: meta.id }],
            icon: 'ph--function--regular',
          },
        },
      ],
    }),
    createExtension({
      id: `${SCRIPT_PLUGIN}/script-companion`,
      filter: (node): node is Node<ScriptType> => isInstanceOf(ScriptType, node.data),
      connector: ({ node }) => [
        {
          id: [node.id, 'automation'].join(ATTENDABLE_PATH_SEPARATOR),
          type: PLANK_COMPANION_TYPE,
          data: 'automation',
          properties: {
            label: ['script automation label', { ns: meta.id }],
            icon: 'ph--lightning--regular',
          },
        },
      ],
    }),
  ]);
