//
// Copyright 2023 DXOS.org
//

import { AddressBook, Calendar, Envelope, type IconProps } from '@phosphor-icons/react';
import { batch, effect } from '@preact/signals-core';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { updateGraphWithAddObjectAction } from '@braneframe/plugin-space';
import { MailboxType, AddressBookType, CalendarType } from '@braneframe/types';
import { type PluginDefinition, parseIntentPlugin, resolvePlugin } from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';
import * as E from '@dxos/echo-schema';
import { Filter } from '@dxos/react-client/echo';

import { ContactsMain, EventsMain, Mailbox } from './components';
import meta, { INBOX_PLUGIN } from './meta';
import translations from './translations';
import { InboxAction, type InboxPluginProvides } from './types';

export const InboxPlugin = (): PluginDefinition<InboxPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [MailboxType.typename]: {
            placeholder: ['mailbox title placeholder', { ns: INBOX_PLUGIN }],
            icon: (props: IconProps) => <Envelope {...props} />,
          },
          [AddressBookType.typename]: {
            placeholder: ['addressbook title placeholder', { ns: INBOX_PLUGIN }],
            icon: (props: IconProps) => <AddressBook {...props} />,
          },
          [CalendarType.typename]: {
            placeholder: ['calendar title placeholder', { ns: INBOX_PLUGIN }],
            icon: (props: IconProps) => <Calendar {...props} />,
          },
        },
      },
      translations,
      echo: {
        schema: [MailboxType, AddressBookType, CalendarType],
      },
      graph: {
        builder: (plugins, graph) => {
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          if (!client || !dispatch) {
            return;
          }

          const subscriptions = new EventSubscriptions();
          const { unsubscribe } = client.spaces.subscribe((spaces) => {
            subscriptions.clear();
            spaces.forEach((space) => {
              subscriptions.add(
                updateGraphWithAddObjectAction({
                  graph,
                  space,
                  plugin: INBOX_PLUGIN,
                  action: InboxAction.CREATE_MAILBOX,
                  properties: {
                    label: ['create mailbox label', { ns: INBOX_PLUGIN }],
                    icon: (props: IconProps) => <Envelope {...props} />,
                  },
                  dispatch,
                }),
              );

              subscriptions.add(
                updateGraphWithAddObjectAction({
                  graph,
                  space,
                  plugin: INBOX_PLUGIN,
                  action: InboxAction.CREATE_ADDRESSBOOK,
                  properties: {
                    label: ['create addressbook label', { ns: INBOX_PLUGIN }],
                    icon: (props: IconProps) => <AddressBook {...props} />,
                  },
                  dispatch,
                }),
              );

              subscriptions.add(
                updateGraphWithAddObjectAction({
                  graph,
                  space,
                  plugin: INBOX_PLUGIN,
                  action: InboxAction.CREATE_CALENDAR,
                  properties: {
                    label: ['create calendar label', { ns: INBOX_PLUGIN }],
                    icon: (props: IconProps) => <Calendar {...props} />,
                  },
                  dispatch,
                }),
              );

              // Add all documents to the graph.
              const mailboxQuery = space.db.query(Filter.schema(MailboxType));
              const addressBookQuery = space.db.query(Filter.schema(AddressBookType));
              const calendarQuery = space.db.query(Filter.schema(CalendarType));
              let previousMailboxes: MailboxType[] = [];
              let previousAddressBooks: AddressBookType[] = [];
              let previousCalendars: CalendarType[] = [];
              subscriptions.add(
                effect(() => {
                  const removedMailboxes = previousMailboxes.filter((object) => !mailboxQuery.objects.includes(object));
                  const removedAddressBooks = previousAddressBooks.filter(
                    (object) => !addressBookQuery.objects.includes(object),
                  );
                  const removedCalendars = previousCalendars.filter(
                    (object) => !calendarQuery.objects.includes(object),
                  );

                  previousMailboxes = mailboxQuery.objects;
                  previousAddressBooks = addressBookQuery.objects;
                  previousCalendars = calendarQuery.objects;

                  batch(() => {
                    removedMailboxes.forEach((object) => graph.removeNode(object.id));
                    removedAddressBooks.forEach((object) => graph.removeNode(object.id));
                    removedCalendars.forEach((object) => graph.removeNode(object.id));

                    mailboxQuery.objects.forEach((object) => {
                      graph.addNodes({
                        id: object.id,
                        data: object,
                        properties: {
                          // TODO(wittjosiah): Reconcile with metadata provides.
                          label: object.title || ['mailbox title placeholder', { ns: INBOX_PLUGIN }],
                          icon: (props: IconProps) => <Envelope {...props} />,
                          testId: 'spacePlugin.object',
                          persistenceClass: 'echo',
                          persistenceKey: space?.key.toHex(),
                        },
                      });
                    });
                    addressBookQuery.objects.forEach((object) => {
                      graph.addNodes({
                        id: object.id,
                        data: object,
                        properties: {
                          // TODO(wittjosiah): Reconcile with metadata provides.
                          label: ['addressbook title placeholder', { ns: INBOX_PLUGIN }],
                          icon: (props: IconProps) => <AddressBook {...props} />,
                          testId: 'spacePlugin.object',
                          persistenceClass: 'echo',
                          persistenceKey: space?.key.toHex(),
                        },
                      });
                    });
                    calendarQuery.objects.forEach((object) => {
                      graph.addNodes({
                        id: object.id,
                        data: object,
                        properties: {
                          // TODO(wittjosiah): Reconcile with metadata provides.
                          label: ['calendar title placeholder', { ns: INBOX_PLUGIN }],
                          icon: (props: IconProps) => <Calendar {...props} />,
                          testId: 'spacePlugin.object',
                          persistenceClass: 'echo',
                          persistenceKey: space?.key.toHex(),
                        },
                      });
                    });
                  });
                }),
              );
            });
          });

          return () => {
            unsubscribe();
            subscriptions.clear();
          };
        },
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              if (data.active instanceof MailboxType) {
                return <Mailbox mailbox={data.active} />;
              }
              if (data.active instanceof AddressBookType) {
                return <ContactsMain contacts={data.active} />;
              }
              if (data.active instanceof CalendarType) {
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
              return { data: E.object(MailboxType, { messages: [] }) };
            }
            case InboxAction.CREATE_ADDRESSBOOK: {
              return { data: E.object(AddressBookType, {}) };
            }
            case InboxAction.CREATE_CALENDAR: {
              return { data: E.object(CalendarType, {}) };
            }
          }
        },
      },
    },
  };
};
