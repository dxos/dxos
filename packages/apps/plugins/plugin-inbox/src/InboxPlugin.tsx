//
// Copyright 2023 DXOS.org
//

import { AddressBook, Calendar, Envelope, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { SPACE_PLUGIN, SpaceAction } from '@braneframe/plugin-space';
import {
  Folder,
  Mailbox as MailboxType,
  AddressBook as AddressBookType,
  Calendar as CalendarType,
} from '@braneframe/types';
import { LayoutAction, type PluginDefinition, parseIntentPlugin, resolvePlugin } from '@dxos/app-framework';
import { type Action } from '@dxos/app-graph';
import { SpaceProxy } from '@dxos/react-client/echo';

import { ContactsMain, EventsMain, Mailbox } from './components';
import meta, { INBOX_PLUGIN } from './meta';
import translations from './translations';
import { InboxAction, type InboxPluginProvides, isAddressBook, isCalendar, isMailbox } from './types';

export const InboxPlugin = (): PluginDefinition<InboxPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [MailboxType.schema.typename]: {
            placeholder: ['mailbox title placeholder', { ns: INBOX_PLUGIN }],
            icon: (props: IconProps) => <Envelope {...props} />,
          },
          [AddressBookType.schema.typename]: {
            placeholder: ['addressbook title placeholder', { ns: INBOX_PLUGIN }],
            icon: (props: IconProps) => <AddressBook {...props} />,
          },
          [CalendarType.schema.typename]: {
            placeholder: ['calendar title placeholder', { ns: INBOX_PLUGIN }],
            icon: (props: IconProps) => <Calendar {...props} />,
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

          const createObject = (action: string, props: Pick<Action, 'id' | 'label' | 'icon'>) => {
            parent.actionsMap[`${SPACE_PLUGIN}/create`]?.addAction({
              ...props,
              invoke: () =>
                intentPlugin?.provides.intent.dispatch([
                  {
                    plugin: INBOX_PLUGIN,
                    action,
                  },
                  {
                    action: SpaceAction.ADD_OBJECT,
                    data: { target: parent.data },
                  },
                  {
                    action: LayoutAction.ACTIVATE,
                  },
                ]),
            });
          };

          // TODO(burdon): Use same id for action and intent?
          createObject(InboxAction.CREATE_MAILBOX, {
            id: `${INBOX_PLUGIN}/create-mailbox`,
            label: ['create mailbox label', { ns: INBOX_PLUGIN }],
            icon: (props) => <Envelope {...props} />,
          });
          createObject(InboxAction.CREATE_ADDRESSBOOK, {
            id: `${INBOX_PLUGIN}/create-addressbook`,
            label: ['create addressbook label', { ns: INBOX_PLUGIN }],
            icon: (props) => <AddressBook {...props} />,
          });
          createObject(InboxAction.CREATE_CALENDAR, {
            id: `${INBOX_PLUGIN}/create-calendar`,
            label: ['create calendar label', { ns: INBOX_PLUGIN }],
            icon: (props) => <Calendar {...props} />,
          });
        },
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              if (isMailbox(data.active)) {
                return <Mailbox mailbox={data.active} />;
              }
              if (isAddressBook(data.active)) {
                return <ContactsMain contacts={data.active} />;
              }
              if (isCalendar(data.active)) {
                return <EventsMain calendar={data.active} />;
              }
              return null;
            default:
              return null;
          }
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case InboxAction.CREATE_MAILBOX: {
              return { data: new MailboxType() };
            }
            case InboxAction.CREATE_ADDRESSBOOK: {
              return { data: new AddressBookType() };
            }
            case InboxAction.CREATE_CALENDAR: {
              return { data: new CalendarType() };
            }
          }
        },
      },
    },
  };
};
