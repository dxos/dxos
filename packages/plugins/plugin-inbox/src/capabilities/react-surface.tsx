//
// Copyright 2025 DXOS.org
//

import { pipe } from 'effect';
import React, { useCallback } from 'react';

import {
  Capabilities,
  LayoutAction,
  chain,
  contributes,
  createIntent,
  createSurface,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { Filter, fullyQualifiedId, getSpace, useQuery, useQueue, useSpace } from '@dxos/react-client/echo';
import { TableType } from '@dxos/react-ui-table';
import { DataType } from '@dxos/schema';

import { EventsContainer, MailboxContainer, MessageContainer, MailboxObjectSettings } from '../components';
import { RelatedContacts, RelatedMessages } from '../components/Related';
import { INBOX_PLUGIN } from '../meta';
import { CalendarType, InboxAction, MailboxType } from '../types';

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
      filter: (data): data is { companionTo: MailboxType; subject: DataType.Message | 'message' } =>
        isInstanceOf(MailboxType, data.companionTo) &&
        (data.subject === 'message' || isInstanceOf(DataType.Message, data.subject)),
      component: ({ data: { companionTo, subject: message } }) => {
        const space = getSpace(companionTo);
        return (
          <MessageContainer
            message={typeof message === 'string' ? undefined : message}
            space={space}
            inMailbox={companionTo}
          />
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

    // TODO(wittjosiah): Generalize the mess below.
    createSurface({
      id: `${INBOX_PLUGIN}/contact-related`,
      role: 'related',
      filter: (data): data is { subject: DataType.Contact } => isInstanceOf(DataType.Contact, data.subject),
      component: ({ data: { subject: contact } }) => {
        const { dispatchPromise: dispatch } = useIntentDispatcher();
        const space = useSpace();
        const [mailbox] = useQuery(space, Filter.schema(MailboxType));
        const queue = useQueue<DataType.Message>(mailbox?.queue.dxn);
        const messages = queue?.items ?? [];
        const related = messages
          .filter(
            (message) =>
              contact.emails?.some((email) => email.value === message.sender.email) ||
              message.sender.contact?.target === contact,
          )
          .filter((message) => message.properties?.subject)
          .toSorted((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
          .slice(0, 5);

        const handleMessageClick = useCallback(
          (message: DataType.Message) => {
            void dispatch(
              pipe(
                createIntent(LayoutAction.UpdatePopover, {
                  part: 'popover',
                  options: {
                    state: false,
                    anchorId: '',
                  },
                }),
                chain(LayoutAction.Open, {
                  part: 'main',
                  subject: [fullyQualifiedId(mailbox)],
                  options: { workspace: space?.id },
                }),
                chain(InboxAction.SelectMessage, { mailboxId: fullyQualifiedId(mailbox), message }),
              ),
            );
          },
          [dispatch, space, mailbox],
        );

        return <RelatedMessages messages={related} onMessageClick={handleMessageClick} />;
      },
    }),
    createSurface({
      id: `${INBOX_PLUGIN}/organization-related`,
      role: 'related',
      filter: (data): data is { subject: DataType.Organization } => isInstanceOf(DataType.Organization, data.subject),
      component: ({ data: { subject: organization } }) => {
        const { dispatchPromise: dispatch } = useIntentDispatcher();
        const space = getSpace(organization);
        const defaultSpace = useSpace();
        const currentSpaceContacts = useQuery(space, Filter.schema(DataType.Contact));
        const defaultSpaceContacts = useQuery(
          defaultSpace === space ? undefined : defaultSpace,
          Filter.schema(DataType.Contact),
        );
        const contacts = [...(currentSpaceContacts ?? []), ...(defaultSpaceContacts ?? [])];
        const related = contacts.filter((contact) =>
          typeof contact.organization === 'string' ? false : contact.organization?.target === organization,
        );

        const currentSpaceTables = useQuery(space, Filter.schema(TableType));
        const defaultSpaceTables = useQuery(defaultSpace, Filter.schema(TableType));
        const currentSpaceContactTable = currentSpaceTables?.find((table) => {
          return table.view?.target?.query?.typename === DataType.Contact.typename;
        });
        const defaultSpaceContactTable = defaultSpaceTables?.find((table) => {
          return table.view?.target?.query?.typename === DataType.Contact.typename;
        });

        const handleContactClick = useCallback(
          async (contact: DataType.Contact) => {
            const table = currentSpaceContacts.includes(contact) ? currentSpaceContactTable : defaultSpaceContactTable;
            await dispatch(
              createIntent(LayoutAction.UpdatePopover, {
                part: 'popover',
                options: {
                  state: false,
                  anchorId: '',
                },
              }),
            );
            if (table) {
              return dispatch(
                createIntent(LayoutAction.Open, {
                  part: 'main',
                  subject: [fullyQualifiedId(table)],
                  options: { workspace: space?.id },
                }),
              );
            }
          },
          [dispatch, currentSpaceContacts, currentSpaceContactTable, defaultSpaceContactTable, space, defaultSpace],
        );

        return <RelatedContacts contacts={related} onContactClick={handleContactClick} />;
      },
    }),
  ]);
