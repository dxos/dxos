//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { meta as spaceMeta } from '@dxos/plugin-space';

import { meta } from '../meta';

export default Capability.makeModule((context) =>
  Capability.contributes(Capabilities.AppGraphBuilder, [
    GraphBuilder.createExtension({
      id: `${meta.id}/space-settings`,
      match: NodeMatcher.whenNodeType(`${spaceMeta.id}/settings`),
      connector: (node) => [
        {
          id: `integrations-${node.id}`,
          type: `${meta.id}/space-settings`,
          data: `${meta.id}/space-settings`,
          properties: {
            label: ['space panel name', { ns: meta.id }],
            icon: 'ph--plugs--regular',
          },
        },
      ],
    }),
  ]),
);
