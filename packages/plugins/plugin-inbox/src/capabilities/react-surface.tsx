//
// Copyright 2025 DXOS.org
//

import { Effect, pipe } from 'effect';
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
import { Obj } from '@dxos/echo';
import { AttentionAction } from '@dxos/plugin-attention/types';
import { ATTENDABLE_PATH_SEPARATOR, DeckAction } from '@dxos/plugin-deck/types';
import { Filter, fullyQualifiedId, getSpace, useQuery, useQueue, useSpace } from '@dxos/react-client/echo';
import { Table } from '@dxos/react-ui-table/types';
import { DataType, typenameFromQuery } from '@dxos/schema';

import { EventsContainer, MailboxContainer, MailboxObjectSettings, MessageCard, MessageContainer } from '../components';
import { RelatedContacts, RelatedMessages } from '../components/Related';
import { INBOX_PLUGIN } from '../meta';
import { Calendar, InboxAction, Mailbox } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${INBOX_PLUGIN}/mailbox`,
      role: ['article', 'section'],
      filter: (data): data is { subject: Mailbox.Mailbox } => Obj.instanceOf(Mailbox.Mailbox, data.subject),
      component: ({ data, role }) => <MailboxContainer mailbox={data.subject} role={role} />,
    }),
    createSurface({
      id: `${INBOX_PLUGIN}/message`,
      role: ['article', 'section', 'card', 'card--intrinsic', 'card--extrinsic', 'card--popover', 'card--transclusion'],
      filter: (data): data is { companionTo: Mailbox.Mailbox; subject: DataType.Message | 'message' } =>
        Obj.instanceOf(Mailbox.Mailbox, data.companionTo) &&
        (data.subject === 'message' || Obj.instanceOf(DataType.Message, data.subject)),
      component: ({ data: { companionTo, subject: message }, role }) => {
        const space = getSpace(companionTo);
        return role.startsWith('card') ? (
          message === 'message' ? null : (
            <MessageCard message={message} role={role} />
          )
        ) : (
          <MessageContainer
            message={typeof message === 'string' ? undefined : message}
            space={space}
            inMailbox={companionTo}
            role={role}
          />
        );
      },
    }),
    createSurface({
      id: `${INBOX_PLUGIN}/calendar`,
      role: 'article',
      filter: (data): data is { subject: Calendar.Calendar } => Obj.instanceOf(Calendar.Calendar, data.subject),
      component: ({ data }) => <EventsContainer calendar={data.subject} />,
    }),
    createSurface({
      id: `${INBOX_PLUGIN}/mailbox/companion/settings`,
      role: 'object-settings',
      filter: (data): data is { subject: Mailbox.Mailbox } => Obj.instanceOf(Mailbox.Mailbox, data.subject),
      component: ({ data }) => <MailboxObjectSettings object={data.subject} />,
    }),

    // TODO(wittjosiah): Generalize the mess below.
    createSurface({
      id: `${INBOX_PLUGIN}/contact-related`,
      role: 'related',
      filter: (data): data is { subject: DataType.Person } => Obj.instanceOf(DataType.Person, data.subject),
      component: ({ data: { subject: contact } }) => {
        const { dispatchPromise: dispatch } = useIntentDispatcher();
        const space = useSpace();
        const [mailbox] = useQuery(space, Filter.type(Mailbox.Mailbox));
        const queue = useQueue<DataType.Message>(mailbox?.queue.dxn);
        const messages = queue?.objects ?? [];
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
      filter: (data): data is { subject: DataType.Organization } => Obj.instanceOf(DataType.Organization, data.subject),
      component: ({ data: { subject: organization } }) => {
        const { dispatch } = useIntentDispatcher();
        const space = getSpace(organization);
        const defaultSpace = useSpace();
        const currentSpaceContacts = useQuery(space, Filter.type(DataType.Person));
        const defaultSpaceContacts = useQuery(
          defaultSpace === space ? undefined : defaultSpace,
          Filter.type(DataType.Person),
        );
        const contacts = [...(currentSpaceContacts ?? []), ...(defaultSpaceContacts ?? [])];
        const related = contacts.filter((contact) =>
          typeof contact.organization === 'string' ? false : contact.organization?.target === organization,
        );

        const currentSpaceViews = useQuery(space, Filter.type(DataType.View));
        const defaultSpaceViews = useQuery(defaultSpace, Filter.type(DataType.View));
        const currentSpaceContactTable = currentSpaceViews.find(
          (view) =>
            typenameFromQuery(view.query) === DataType.Person.typename &&
            Obj.instanceOf(Table.Table, view.presentation.target),
        );
        const defaultSpaceContactTable = defaultSpaceViews.find(
          (view) =>
            typenameFromQuery(view.query) === DataType.Person.typename &&
            Obj.instanceOf(Table.Table, view.presentation.target),
        );

        // TODO(wittjosiah): Generalized way of handling related objects navigation.
        const handleContactClick = useCallback(
          (contact: DataType.Person) =>
            Effect.gen(function* () {
              const view = currentSpaceContacts.includes(contact) ? currentSpaceContactTable : defaultSpaceContactTable;
              yield* dispatch(
                createIntent(LayoutAction.UpdatePopover, {
                  part: 'popover',
                  options: {
                    state: false,
                    anchorId: '',
                  },
                }),
              );
              if (view) {
                const id = fullyQualifiedId(view);
                yield* dispatch(
                  createIntent(LayoutAction.Open, {
                    part: 'main',
                    subject: [id],
                    options: { workspace: space?.id },
                  }),
                );
                yield* dispatch(
                  createIntent(DeckAction.ChangeCompanion, {
                    primary: id,
                    companion: [id, 'selected-objects'].join(ATTENDABLE_PATH_SEPARATOR),
                  }),
                );
                yield* dispatch(
                  createIntent(AttentionAction.Select, {
                    contextId: id,
                    selection: { mode: 'multi', ids: [contact.id] },
                  }),
                );
              }
            }).pipe(Effect.runPromise),
          [dispatch, currentSpaceContacts, currentSpaceContactTable, defaultSpaceContactTable, space, defaultSpace],
        );

        return <RelatedContacts contacts={related} onContactClick={handleContactClick} />;
      },
    }),
  ]);
