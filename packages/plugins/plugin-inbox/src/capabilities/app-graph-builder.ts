//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { COMPANION_TYPE, SLUG_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { createExtension, type Node } from '@dxos/plugin-graph';

import { InboxCapabilities } from './capabilities';
import { INBOX_PLUGIN } from '../meta';
import { MailboxType } from '../types';

export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${INBOX_PLUGIN}/mailbox-message`,
      filter: (node): node is Node<MailboxType> => isInstanceOf(MailboxType, node.data),
      connector: ({ node }) => {
        const state = context.requestCapability(InboxCapabilities.MailboxState);
        const message = state[node.id];
        return [
          {
            id: `${node.id}${SLUG_PATH_SEPARATOR}message`,
            type: COMPANION_TYPE,
            data: message,
            properties: {
              label: ['message label', { ns: INBOX_PLUGIN }],
              icon: 'ph--envelope-open--regular',
            },
          },
        ];
      },
    }),
  ]);
