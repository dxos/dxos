//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { createIntent, createResolver, createSurface, type PluginDefinition } from '@dxos/app-framework';
import { create } from '@dxos/live-object';
import { loadObjectReferences } from '@dxos/react-client/echo';

import { ContactsContainer, EventsContainer, MailboxContainer } from './components';
import meta, { INBOX_PLUGIN } from './meta';
import translations from './translations';
import { CalendarType, ContactsType, EventType, InboxAction, type InboxPluginProvides, MailboxType } from './types';

export const InboxPlugin = (): PluginDefinition<InboxPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [MailboxType.typename]: {
            createObject: (props: { name?: string }) => createIntent(InboxAction.CreateMailbox, props),
            placeholder: ['mailbox title placeholder', { ns: INBOX_PLUGIN }],
            icon: 'ph--envelope--regular',
          },
          [ContactsType.typename]: {
            createObject: (props: { name?: string }) => createIntent(InboxAction.CreateContacts, props),
            placeholder: ['contacts title placeholder', { ns: INBOX_PLUGIN }],
            icon: 'ph--address-book--regular',
          },
          [CalendarType.typename]: {
            createObject: (props: { name?: string }) => createIntent(InboxAction.CreateCalendar, props),
            placeholder: ['calendar title placeholder', { ns: INBOX_PLUGIN }],
            icon: 'ph--calendar--regular',
          },
          [EventType.typename]: {
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (event: EventType) => loadObjectReferences(event, (event) => event.links),
          },
        },
      },
      translations,
      echo: {
        schema: [MailboxType, ContactsType, CalendarType],
      },
      surface: {
        definitions: () => [
          createSurface({
            id: `${INBOX_PLUGIN}/mailbox`,
            role: 'article',
            filter: (data): data is { subject: MailboxType } => data.subject instanceof MailboxType,
            component: ({ data }) => <MailboxContainer mailbox={data.subject} />,
          }),
          createSurface({
            id: `${INBOX_PLUGIN}/contacts`,
            role: 'article',
            filter: (data): data is { subject: ContactsType } => data.subject instanceof ContactsType,
            component: ({ data }) => <ContactsContainer contacts={data.subject} />,
          }),
          createSurface({
            id: `${INBOX_PLUGIN}/calendar`,
            role: 'article',
            filter: (data): data is { subject: CalendarType } => data.subject instanceof CalendarType,
            component: ({ data }) => <EventsContainer calendar={data.subject} />,
          }),
        ],
      },
      intent: {
        resolvers: () => [
          createResolver(InboxAction.CreateMailbox, () => ({
            data: { object: create(MailboxType, { messages: [] }) },
          })),
          createResolver(InboxAction.CreateContacts, () => ({
            data: { object: create(ContactsType, {}) },
          })),
          createResolver(InboxAction.CreateCalendar, () => ({
            data: { object: create(CalendarType, {}) },
          })),
        ],
      },
    },
  };
};
