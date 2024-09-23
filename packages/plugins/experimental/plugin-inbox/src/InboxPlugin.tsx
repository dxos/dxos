//
// Copyright 2024 DXOS.org
//

import { AddressBook, Calendar, Envelope, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { parseIntentPlugin, type PluginDefinition, resolvePlugin, NavigationAction } from '@dxos/app-framework';
import { create } from '@dxos/echo-schema';
import { parseClientPlugin } from '@dxos/plugin-client';
import { type ActionGroup, createExtension, isActionGroup } from '@dxos/plugin-graph';
import { SpaceAction } from '@dxos/plugin-space';
import { loadObjectReferences } from '@dxos/react-client/echo';

import { ContactsMain, EventsMain } from './components';
import meta, { INBOX_PLUGIN } from './meta';
import translations from './translations';
import { ContactsType, CalendarType, EventType, MailboxType } from './types';
import { InboxAction, type InboxPluginProvides } from './types';

export const InboxPlugin = (): PluginDefinition<InboxPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          // TODO(wittjosiah): Reconcile with ChannelType.
          [MailboxType.typename]: {
            placeholder: ['mailbox title placeholder', { ns: INBOX_PLUGIN }],
            icon: (props: IconProps) => <Envelope {...props} />,
          },
          [ContactsType.typename]: {
            placeholder: ['contacts title placeholder', { ns: INBOX_PLUGIN }],
            icon: (props: IconProps) => <AddressBook {...props} />,
            iconSymbol: 'ph--address-book--regular',
          },
          [CalendarType.typename]: {
            placeholder: ['calendar title placeholder', { ns: INBOX_PLUGIN }],
            icon: (props: IconProps) => <Calendar {...props} />,
            iconSymbol: 'ph--calendar--regular',
          },
          [EventType.typename]: {
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (event: EventType) => loadObjectReferences(event, (event) => event.links),
          },
        },
      },
      translations,
      echo: {
        schema: [ContactsType, CalendarType],
      },
      graph: {
        builder: (plugins) => {
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          if (!client || !dispatch) {
            return [];
          }

          return createExtension({
            id: INBOX_PLUGIN,
            filter: (node): node is ActionGroup => isActionGroup(node) && node.id.startsWith(SpaceAction.ADD_OBJECT),
            actions: ({ node }) => {
              const id = node.id.split('/').at(-1);
              const [spaceId, objectId] = id?.split(':') ?? [];
              const space = client.spaces.get().find((space) => space.id === spaceId);
              const object = objectId && space?.db.getObjectById(objectId);
              const target = objectId ? object : space;
              if (!target) {
                return;
              }

              return [
                {
                  id: `${INBOX_PLUGIN}/create-mailbox/${node.id}`,
                  data: async () => {
                    await dispatch([
                      { plugin: INBOX_PLUGIN, action: InboxAction.CREATE_MAILBOX },
                      { action: SpaceAction.ADD_OBJECT, data: { target } },
                      { action: NavigationAction.OPEN },
                    ]);
                  },
                  properties: {
                    label: ['create mailbox label', { ns: INBOX_PLUGIN }],
                    icon: (props: IconProps) => <Envelope {...props} />,
                    iconSymbol: 'ph--envelope--regular',
                  },
                },
                {
                  id: `${INBOX_PLUGIN}/create-contacts/${node.id}`,
                  data: async () => {
                    await dispatch([
                      { plugin: INBOX_PLUGIN, action: InboxAction.CREATE_CONTACTS },
                      { action: SpaceAction.ADD_OBJECT, data: { target } },
                      { action: NavigationAction.OPEN },
                    ]);
                  },
                  properties: {
                    label: ['create contacts label', { ns: INBOX_PLUGIN }],
                    icon: (props: IconProps) => <AddressBook {...props} />,
                    iconSymbol: 'ph--address-book--regular',
                  },
                },
                {
                  id: `${INBOX_PLUGIN}/create-calendar/${node.id}`,
                  data: async () => {
                    await dispatch([
                      { plugin: INBOX_PLUGIN, action: InboxAction.CREATE_CALENDAR },
                      { action: SpaceAction.ADD_OBJECT, data: { target } },
                      { action: NavigationAction.OPEN },
                    ]);
                  },
                  properties: {
                    label: ['create calendar label', { ns: INBOX_PLUGIN }],
                    icon: (props: IconProps) => <Calendar {...props} />,
                    iconSymbol: 'ph--calendar--regular',
                  },
                },
              ];
            },
          });
        },
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              // if (data.active instanceof MailboxType) {
              //   return <MailboxMain mailbox={data.active} />;
              // }
              if (data.active instanceof ContactsType) {
                return <ContactsMain contacts={data.active} />;
              }
              if (data.active instanceof CalendarType) {
                return <EventsMain calendar={data.active} />;
              }
              return null;
            case 'article': {
              // if (data.object instanceof MailboxType) {
              //   return <MailboxArticle mailbox={data.object} />;
              // }
              return null;
            }

            default:
              return null;
          }
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case InboxAction.CREATE_MAILBOX: {
              return { data: create(MailboxType, { messages: [] }) };
            }
            case InboxAction.CREATE_CONTACTS: {
              return { data: create(ContactsType, {}) };
            }
            case InboxAction.CREATE_CALENDAR: {
              return { data: create(CalendarType, {}) };
            }
          }
        },
      },
    },
  };
};
