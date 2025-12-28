//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { Script } from '@dxos/functions';
import { ATTENDABLE_PATH_SEPARATOR, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { meta as spaceMeta } from '@dxos/plugin-space';

import { meta } from '../meta';

export default Capability.makeModule((context) => {
  return Capability.contributes(Capabilities.AppGraphBuilder, [
    GraphBuilder.createExtension({
      id: `${meta.id}/space-settings-automation`,
      match: NodeMatcher.whenNodeType(`${spaceMeta.id}/settings`),
      connector: (node, get) => [
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
    GraphBuilder.createExtension({
      id: `${meta.id}/space-settings-functions`,
      match: NodeMatcher.whenNodeType(`${spaceMeta.id}/settings`),
      connector: (node, get) => [
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
    GraphBuilder.createTypeExtension({
      id: `${meta.id}/script-companion`,
      type: Script.Script,
      connector: (script, get) => [
        {
          id: [script.id, 'automation'].join(ATTENDABLE_PATH_SEPARATOR),
          type: PLANK_COMPANION_TYPE,
          data: 'automation',
          properties: {
            label: ['script automation label', { ns: meta.id }],
            icon: 'ph--lightning--regular',
            disposition: 'hidden',
          },
        },
      ],
    }),
  ]);
});
