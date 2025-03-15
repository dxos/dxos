//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';

import { ContactsContainer, EventsContainer, MailboxContainer } from '../components';
import { INBOX_PLUGIN } from '../meta';
import { CalendarType, ContactsType, MailboxType } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
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
  ]);
