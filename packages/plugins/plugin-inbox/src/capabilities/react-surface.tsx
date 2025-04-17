//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { useTranslation } from '@dxos/react-ui';
import type { MessageType } from '@dxos/schema';

import { ContactsContainer, EventsContainer, MailboxContainer, MessageContainer } from '../components';
import { INBOX_PLUGIN } from '../meta';
import { CalendarType, ContactsType, MailboxType } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${INBOX_PLUGIN}/mailbox`,
      role: 'article',
      filter: (data): data is { subject: MailboxType; variant: undefined } =>
        isInstanceOf(MailboxType, data.subject) && !data.variant,
      component: ({ data }) => <MailboxContainer mailbox={data.subject} />,
    }),
    createSurface({
      id: `${INBOX_PLUGIN}/message`,
      role: 'article',
      filter: (data): data is { companionTo: MailboxType; subject: MessageType | undefined; variant: 'message' } =>
        isInstanceOf(MailboxType, data.companionTo) && data.variant === 'message',
      component: ({ data: { subject: message } }) => {
        const { t } = useTranslation(INBOX_PLUGIN);
        return message ? (
          <MessageContainer message={message} />
        ) : (
          // TODO(burdon): Move into message container.
          <p className='p-8 text-center text-description'>{t('no message message')}</p>
        );
      },
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
