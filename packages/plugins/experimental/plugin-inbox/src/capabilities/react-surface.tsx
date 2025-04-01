//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';

import { ContactsContainer, EventsContainer, MailboxContainer } from '../components';
import { INBOX_PLUGIN } from '../meta';
import { CalendarType, ContactsType, MailboxType } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${INBOX_PLUGIN}/mailbox`,
      role: 'article',
      filter: (data): data is { subject: MailboxType } => isInstanceOf(MailboxType, data.subject),
      component: ({ data }) => <MailboxContainer mailbox={data.subject} />,
    }),
    createSurface({
      id: `${INBOX_PLUGIN}/contacts`,
      role: 'article',
      filter: (data): data is { subject: ContactsType } => isInstanceOf(ContactsType, data.subject),
      component: ({ data }) => <ContactsContainer contacts={data.subject} />,
    }),
    createSurface({
      id: `${INBOX_PLUGIN}/calendar`,
      role: 'article',
      filter: (data): data is { subject: CalendarType } => isInstanceOf(CalendarType, data.subject),
      component: ({ data }) => <EventsContainer calendar={data.subject} />,
    }),
  ]);
