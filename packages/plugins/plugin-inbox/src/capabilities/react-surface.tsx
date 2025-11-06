//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
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
import { View, getTypenameFromQuery } from '@dxos/schema';
import { Message, Organization, Person } from '@dxos/types';

import {
  EventsContainer,
  MailboxContainer,
  MailboxObjectSettings,
  MessageCard,
  MessageContainer,
  POPOVER_SAVE_FILTER,
  PopoverSaveFilter,
  RelatedContacts,
  RelatedMessages,
} from '../components';
import { meta } from '../meta';
import { Calendar, InboxAction, Mailbox } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${meta.id}/mailbox`,
      role: ['article', 'section'],
      filter: (data): data is { attendableId?: string; subject: Mailbox.Mailbox; properties: { filter?: string } } =>
        Obj.instanceOf(Mailbox.Mailbox, data.subject),
      component: ({ data, role }) => {
        return (
          <MailboxContainer
            mailbox={data.subject}
            role={role}
            attendableId={data.attendableId}
            filter={data.properties?.filter}
          />
        );
      },
    }),
    createSurface({
      id: `${meta.id}/message`,
      role: ['article', 'section'],
      filter: (data): data is { companionTo: Mailbox.Mailbox; subject: Message.Message | 'message' } =>
        Obj.instanceOf(Mailbox.Mailbox, data.companionTo) &&
        (data.subject === 'message' || Obj.instanceOf(Message.Message, data.subject)),
      component: ({ data: { companionTo, subject: message }, role }) => {
        const space = getSpace(companionTo);
        return (
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
      id: `${meta.id}/calendar`,
      role: 'article',
      filter: (data): data is { subject: Calendar.Calendar } => Obj.instanceOf(Calendar.Calendar, data.subject),
      component: ({ data }) => <EventsContainer calendar={data.subject} />,
    }),
    createSurface({
      id: `${meta.id}/message-card`,
      role: ['card', 'card--intrinsic', 'card--extrinsic', 'card--popover', 'card--transclusion'],
      filter: (data): data is { subject: Message.Message } => Obj.instanceOf(Message.Message, data?.subject),
      component: ({ data: { subject: message }, role }) => <MessageCard message={message} role={role} />,
    }),
    createSurface({
      id: POPOVER_SAVE_FILTER,
      role: 'card--popover',
      filter: (data): data is { props: { mailbox: Mailbox.Mailbox; filter: string } } =>
        data.component === POPOVER_SAVE_FILTER &&
        data.props !== null &&
        typeof data.props === 'object' &&
        'mailbox' in data.props &&
        'filter' in data.props &&
        Obj.instanceOf(Mailbox.Mailbox, data.props.mailbox) &&
        typeof data.props.filter === 'string',
      component: ({ data }) => <PopoverSaveFilter mailbox={data.props.mailbox} filter={data.props.filter} />,
    }),
    createSurface({
      id: `${meta.id}/mailbox/companion/settings`,
      role: 'object-settings',
      filter: (data): data is { subject: Mailbox.Mailbox } => Obj.instanceOf(Mailbox.Mailbox, data.subject),
      component: ({ data }) => <MailboxObjectSettings object={data.subject} />,
    }),

    // TODO(wittjosiah): Generalize the mess below.
    createSurface({
      id: `${meta.id}/contact-related`,
      role: 'related',
      filter: (data): data is { subject: Person.Person } => Obj.instanceOf(Person.Person, data.subject),
      component: ({ data: { subject: contact } }) => {
        const { dispatchPromise: dispatch } = useIntentDispatcher();
        const space = useSpace();
        const [mailbox] = useQuery(space, Filter.type(Mailbox.Mailbox));
        const queue = useQueue<Message.Message>(mailbox?.queue.dxn);
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
          (message: Message.Message) => {
            void dispatch(
              Function.pipe(
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
      id: `${meta.id}/organization-related`,
      role: 'related',
      filter: (data): data is { subject: Organization.Organization } =>
        Obj.instanceOf(Organization.Organization, data.subject),
      component: ({ data: { subject: organization } }) => {
        const { dispatch } = useIntentDispatcher();
        const space = getSpace(organization);
        const defaultSpace = useSpace();
        const currentSpaceContacts = useQuery(space, Filter.type(Person.Person));
        const defaultSpaceContacts = useQuery(
          defaultSpace === space ? undefined : defaultSpace,
          Filter.type(Person.Person),
        );
        const contacts = [...(currentSpaceContacts ?? []), ...(defaultSpaceContacts ?? [])];
        const related = contacts.filter((contact) =>
          typeof contact.organization === 'string' ? false : contact.organization?.target === organization,
        );

        const currentSpaceViews = useQuery(space, Filter.type(View.View));
        const defaultSpaceViews = useQuery(defaultSpace, Filter.type(View.View));
        const currentSpaceContactTable = currentSpaceViews.find(
          (view) =>
            getTypenameFromQuery(view.query.ast) === Person.Person.typename &&
            Obj.instanceOf(Table.Table, view.presentation.target),
        );
        const defaultSpaceContactTable = defaultSpaceViews.find(
          (view) =>
            getTypenameFromQuery(view.query.ast) === Person.Person.typename &&
            Obj.instanceOf(Table.Table, view.presentation.target),
        );

        // TODO(wittjosiah): Generalized way of handling related objects navigation.
        const handleContactClick = useCallback(
          (contact: Person.Person) =>
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
