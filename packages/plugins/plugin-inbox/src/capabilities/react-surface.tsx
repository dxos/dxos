//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { useQueue } from '@dxos/react-client/echo';
import { Status } from '@dxos/react-ui';
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
      filter: (data): data is { subject: MailboxType; variant: `message-${string}` } =>
        isInstanceOf(MailboxType, data.subject) &&
        ((data.variant as string | undefined)?.startsWith('message-') ?? false),
      component: ({ data: { subject, variant } }) => {
        // TODO(thure): This is terrible but, as of the time of this writing, necessary. Planks firmly belong to Deck,
        //  which have no business trying to keep track of actual objects, so they reasonably rely on managing state
        //  using IDs, particularly so Deck state can be serialized. We therefore need an O(1) way of getting objects
        //  whenever we have all the necessary id’s, e.g. we know this message belongs to a mailbox… this is similar
        //  perhaps to `fullyQualifiedId`, messages could be addressed as {spaceId}:{mailboxId}:{messageId}, and any
        //  type which carries a queue should also implement a way of fetching specific items that are present on
        //  that queue.
        const [_, messageId] = variant.split('message-');
        const queue = useQueue<MessageType>(subject.queue.dxn);
        const message = useMemo(
          () => [...(queue?.items ?? [])].find((message) => message.id === messageId),
          [queue?.items, messageId],
        );
        return message ? <MessageContainer message={message} /> : <Status indeterminate aria-label='Loading…' />;
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
