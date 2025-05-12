//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { type AnyLiveObject } from '@dxos/client/echo';
import { PLANK_COMPANION_TYPE, ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { createExtension, type Node } from '@dxos/plugin-graph';

import { meta } from '../meta';

export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${meta.id}/comments`,
      // TODO(wittjosiah): Support comments on any object.
      // filter: (node): node is Node<AnyLiveObject<any>> => isEchoObject(node.data),
      filter: (node): node is Node<AnyLiveObject<any>> =>
        !!node.data && typeof node.data === 'object' && 'threads' in node.data && Array.isArray(node.data.threads),
      connector: ({ node }) => [
        {
          id: [node.id, 'comments'].join(ATTENDABLE_PATH_SEPARATOR),
          type: PLANK_COMPANION_TYPE,
          data: 'comments',
          properties: {
            label: ['comments label', { ns: meta.id }],
            icon: 'ph--chat-text--regular',
            disposition: 'hidden',
            position: 'hoist',
          },
        },
      ],
    }),
  ]);
