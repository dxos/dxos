//
// Copyright 2024 DXOS.org
//

import { AddressBook, Calendar, Envelope, type IconProps } from '@phosphor-icons/react';
import { batch, effect } from '@preact/signals-core';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { parseSpacePlugin, updateGraphWithAddObjectAction } from '@braneframe/plugin-space';
import { AddressBookType, CalendarType, MailboxType } from '@braneframe/types';
import { parseIntentPlugin, type PluginDefinition, resolvePlugin } from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';
import { create } from '@dxos/echo-schema';
import { Filter, fullyQualifiedId } from '@dxos/react-client/echo';

import { ContactsMain, EventsMain, MailboxArticle, MailboxMain } from './components';
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
          const enabled = resolvePlugin(plugins, parseSpacePlugin)?.provides.space.enabled;
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          if (!client || !dispatch || !enabled) {
            return;
          }

          const subscriptions = new EventSubscriptions();
          const unsubscribe = effect(() => {
            subscriptions.clear();
            client.spaces.get().forEach((space) => {
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
            });

            client.spaces
              .get()
              .filter((space) => !!enabled.find((key) => key.equals(space.key)))
              .forEach((space) => {
                // Add all documents to the graph.
                // TODO(burdon): Factor out common action.
                const mailboxQuery = space.db.query(Filter.schema(MailboxType));
                const addressBookQuery = space.db.query(Filter.schema(AddressBookType));
                const calendarQuery = space.db.query(Filter.schema(CalendarType));
                subscriptions.add(mailboxQuery.subscribe());
                subscriptions.add(addressBookQuery.subscribe());
                subscriptions.add(calendarQuery.subscribe());
                let previousMailboxes: MailboxType[] = [];
                let previousAddressBooks: AddressBookType[] = [];
                let previousCalendars: CalendarType[] = [];
                subscriptions.add(
                  effect(() => {
                    const removedMailboxes = previousMailboxes.filter(
                      (object) => !mailboxQuery.objects.includes(object),
                    );
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
                      removedMailboxes.forEach((object) => graph.removeNode(fullyQualifiedId(object)));
                      removedAddressBooks.forEach((object) => graph.removeNode(fullyQualifiedId(object)));
                      removedCalendars.forEach((object) => graph.removeNode(fullyQualifiedId(object)));

                      mailboxQuery.objects.forEach((object) => {
                        graph.addNodes({
                          id: fullyQualifiedId(object),
                          data: object,
                          properties: {
                            // TODO(wittjosiah): Reconcile with metadata provides.
                            label: object.title || ['mailbox title placeholder', { ns: INBOX_PLUGIN }],
                            icon: (props: IconProps) => <Envelope {...props} />,
                            testId: 'spacePlugin.object',
                            persistenceClass: 'echo',
                            persistenceKey: space?.id,
                          },
                        });
                      });
                      addressBookQuery.objects.forEach((object) => {
                        graph.addNodes({
                          id: fullyQualifiedId(object),
                          data: object,
                          properties: {
                            // TODO(wittjosiah): Reconcile with metadata provides.
                            label: ['addressbook title placeholder', { ns: INBOX_PLUGIN }],
                            icon: (props: IconProps) => <AddressBook {...props} />,
                            testId: 'spacePlugin.object',
                            persistenceClass: 'echo',
                            persistenceKey: space?.id,
                          },
                        });
                      });
                      calendarQuery.objects.forEach((object) => {
                        graph.addNodes({
                          id: fullyQualifiedId(object),
                          data: object,
                          properties: {
                            // TODO(wittjosiah): Reconcile with metadata provides.
                            label: ['calendar title placeholder', { ns: INBOX_PLUGIN }],
                            icon: (props: IconProps) => <Calendar {...props} />,
                            testId: 'spacePlugin.object',
                            persistenceClass: 'echo',
                            persistenceKey: space?.id,
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
                return <MailboxMain mailbox={data.active} />;
              }
              if (data.active instanceof AddressBookType) {
                return <ContactsMain contacts={data.active} />;
              }
              if (data.active instanceof CalendarType) {
                return <EventsMain calendar={data.active} />;
              }
              return null;
            case 'article': {
              if (data.object instanceof MailboxType) {
                return <MailboxArticle mailbox={data.object} />;
              }
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
            case InboxAction.CREATE_ADDRESSBOOK: {
              return { data: create(AddressBookType, {}) };
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
