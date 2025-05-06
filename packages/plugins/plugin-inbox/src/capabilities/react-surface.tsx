//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { Filter, getSpace, useQuery, useQueue, useSpace } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { Contact, MessageType, Organization } from '@dxos/schema';

import { EventsContainer, MailboxContainer, MessageContainer, MailboxObjectSettings } from '../components';
import { INBOX_PLUGIN } from '../meta';
import { CalendarType, MailboxType } from '../types';

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
      filter: (data): data is { companionTo: MailboxType; subject: MessageType | 'message' } =>
        isInstanceOf(MailboxType, data.companionTo) &&
        (data.subject === 'message' || isInstanceOf(MessageType, data.subject)),
      component: ({ data: { companionTo, subject: message } }) => {
        const { t } = useTranslation(INBOX_PLUGIN);
        const space = getSpace(companionTo);
        return typeof message === 'string' ? (
          // TODO(burdon): Move into message container.
          <p className='p-8 text-center text-description'>{t('no message message')}</p>
        ) : (
          <MessageContainer message={message} space={space} inMailbox={companionTo} />
        );
      },
    }),
    createSurface({
      id: `${INBOX_PLUGIN}/calendar`,
      role: 'article',
      filter: (data): data is { subject: CalendarType } => isInstanceOf(CalendarType, data.subject),
      component: ({ data }) => <EventsContainer calendar={data.subject} />,
    }),
    createSurface({
      id: `${INBOX_PLUGIN}/mailbox/companion/settings`,
      role: 'object-settings',
      filter: (data): data is { subject: MailboxType } => isInstanceOf(MailboxType, data.subject),
      component: ({ data }) => <MailboxObjectSettings object={data.subject} />,
    }),
    createSurface({
      id: `${INBOX_PLUGIN}/contact-related`,
      role: 'related',
      filter: (data): data is { subject: Contact } => isInstanceOf(Contact, data.subject),
      component: ({ data: { subject: contact } }) => {
        const space = useSpace();
        const [mailbox] = useQuery(space, Filter.schema(MailboxType));
        const queue = useQueue<MessageType>(mailbox?.queue.dxn);
        const messages = queue?.items ?? [];
        const related = messages
          .filter(
            (message) =>
              contact.emails?.some((email) => email.value === message.sender.email) ||
              message.sender.contact?.target === contact,
          )
          .filter((message) => message.properties?.subject);
        // TODO(wittjosiah): Render properly.
        return <div>{related.map((message) => message.properties?.subject)}</div>;
      },
    }),
    createSurface({
      id: `${INBOX_PLUGIN}/organization-related`,
      role: 'related',
      filter: (data): data is { subject: Organization } => isInstanceOf(Organization, data.subject),
      component: ({ data: { subject: organization } }) => {
        const space = useSpace();
        const contacts = useQuery(space, Filter.schema(Contact));
        const related = contacts.filter((contact) =>
          typeof contact.organization === 'string' ? false : contact.organization?.target === organization,
        );
        // TODO(wittjosiah): Render properly.
        return <div>{related.map((contact) => contact.fullName)}</div>;
      },
    }),
  ]);
