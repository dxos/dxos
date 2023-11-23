//
// Copyright 2023 DXOS.org
//

import { Envelope, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { SPACE_PLUGIN, SpaceAction } from '@braneframe/plugin-space';
import { Folder, Mailbox as MailboxType } from '@braneframe/types';
import {
  LayoutAction,
  // type GraphPluginProvides,
  // type LayoutProvides,
  // type Plugin,
  type PluginDefinition,
  parseIntentPlugin,
  // parseLayoutPlugin,
  // parseGraphPlugin,
  resolvePlugin,
} from '@dxos/app-framework';
import { SpaceProxy } from '@dxos/react-client/echo';

import { Mailbox } from './components';
import meta, { INBOX_PLUGIN } from './meta';
import translations from './translations';
import { InboxAction, type InboxPluginProvides, isInbox } from './types';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[MailboxType.name] = MailboxType;

export const InboxPlugin = (): PluginDefinition<InboxPluginProvides> => {
  // let graphPlugin: Plugin<GraphPluginProvides> | undefined;
  // let layoutPlugin: Plugin<LayoutProvides> | undefined; // TODO(burdon): LayoutPluginProvides or LayoutProvides.

  return {
    meta,
    ready: async (plugins) => {
      // graphPlugin = resolvePlugin(plugins, parseGraphPlugin);
      // layoutPlugin = resolvePlugin(plugins, parseLayoutPlugin);
    },
    provides: {
      metadata: {
        records: {
          [MailboxType.schema.typename]: {
            placeholder: ['inbox title placeholder', { ns: INBOX_PLUGIN }],
            icon: (props: IconProps) => <Envelope {...props} />,
          },
        },
      },
      translations,
      graph: {
        builder: ({ parent, plugins }) => {
          // TODO(burdon): Remove refs to SpaceProxy.
          if (!(parent.data instanceof Folder || parent.data instanceof SpaceProxy)) {
            return;
          }

          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

          parent.actionsMap[`${SPACE_PLUGIN}/create`]?.addAction({
            id: `${INBOX_PLUGIN}/create`,
            label: ['create inbox label', { ns: INBOX_PLUGIN }],
            icon: (props) => <Envelope {...props} />,
            invoke: () =>
              intentPlugin?.provides.intent.dispatch([
                {
                  plugin: INBOX_PLUGIN,
                  action: InboxAction.CREATE,
                },
                {
                  action: SpaceAction.ADD_OBJECT,
                  data: { target: parent.data },
                },
                {
                  action: LayoutAction.ACTIVATE,
                },
              ]),
            properties: {
              testId: 'inboxPlugin.createObject',
            },
          });
        },
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              return isInbox(data.active) ? <Mailbox mailbox={data.active} /> : null;
            default:
              return null;
          }
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case InboxAction.CREATE: {
              return { object: new MailboxType() };
            }
          }
        },
      },
    },
  };
};
