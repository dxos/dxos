//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import React, { useCallback } from 'react';

import { Capabilities, LayoutAction, chain, contributes, createIntent, createSurface } from '@dxos/app-framework';
import { useIntentDispatcher } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { AttentionAction } from '@dxos/plugin-attention/types';
import { ATTENDABLE_PATH_SEPARATOR, DeckAction } from '@dxos/plugin-deck/types';
import { Filter, getSpace, useQuery, useQueue, useSpace } from '@dxos/react-client/echo';
import { Table } from '@dxos/react-ui-table/types';
import { getTypenameFromQuery } from '@dxos/schema';
import { Event, Message, Organization, Person } from '@dxos/types';

import {
  CalendarArticle,
  EventArticle,
  EventCard,
  MailboxArticle,
  MailboxSettings,
  MessageArticle,
  MessageCard,
  POPOVER_SAVE_FILTER,
  PopoverSaveFilter,
  RelatedContacts,
  RelatedMessages,
} from '../components';
import { meta } from '../meta';
import { Calendar, Mailbox } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${meta.id}/mailbox`,
      role: ['article'],
      filter: (
        data,
      ): data is {
        attendableId?: string;
        subject: Mailbox.Mailbox;
        properties: { filter?: string };
      } => Obj.instanceOf(Mailbox.Mailbox, data.subject),
      component: ({ data }) => {
        return (
          <MailboxArticle subject={data.subject} filter={data.properties?.filter} attendableId={data.attendableId} />
        );
      },
    }),
    createSurface({
      id: `${meta.id}/message`,
      role: ['article', 'section'],
      filter: (data): data is { subject: Message.Message; companionTo: Mailbox.Mailbox } =>
        Obj.instanceOf(Message.Message, data.subject) && Obj.instanceOf(Mailbox.Mailbox, data.companionTo),
      component: ({ data: { companionTo, subject }, role }) => {
        return <MessageArticle role={role} subject={subject} mailbox={companionTo} />;
      },
    }),
    createSurface({
      id: `${meta.id}/event`,
      role: ['article', 'section'],
      filter: (data): data is { subject: Event.Event; companionTo: Calendar.Calendar } =>
        Obj.instanceOf(Event.Event, data.subject) && Obj.instanceOf(Calendar.Calendar, data.companionTo),
      component: ({ data: { companionTo, subject }, role }) => {
        return <EventArticle role={role} subject={subject} calendar={companionTo} />;
      },
    }),
    createSurface({
      id: `${meta.id}/calendar`,
      role: ['article'],
      filter: (data): data is { subject: Calendar.Calendar } => Obj.instanceOf(Calendar.Calendar, data.subject),
      component: ({ data }) => <CalendarArticle subject={data.subject} />,
    }),
    createSurface({
      id: `${meta.id}/message-card`,
      role: ['card', 'card--intrinsic', 'card--extrinsic', 'card--popover', 'card--transclusion'],
      filter: (data): data is { subject: Message.Message } => Obj.instanceOf(Message.Message, data?.subject),
      component: ({ data: { subject }, role }) => <MessageCard subject={subject} role={role} />,
    }),
    createSurface({
      id: `${meta.id}/event-card`,
      role: ['card', 'card--intrinsic', 'card--extrinsic', 'card--popover', 'card--transclusion'],
      filter: (data): data is { subject: Event.Event } => Obj.instanceOf(Event.Event, data?.subject),
      component: ({ data: { subject }, role }) => <EventCard subject={subject} role={role} />,
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
      component: ({ data }) => <MailboxSettings subject={data.subject} />,
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
                  subject: [Obj.getDXN(mailbox).toString()],
                  options: { workspace: space?.id },
                }),
                chain(AttentionAction.Select, {
                  contextId: Obj.getDXN(mailbox).toString(),
                  selection: { mode: 'single', id: message.id },
                }),
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

        const currentSpaceViews = useQuery(space, Filter.type(Table.Table));
        const defaultSpaceViews = useQuery(defaultSpace, Filter.type(Table.Table));
        const currentSpaceContactTable = currentSpaceViews.find(
          (table) => getTypenameFromQuery(table.view.target?.query.ast) === Person.Person.typename,
        );
        const defaultSpaceContactTable = defaultSpaceViews.find(
          (table) => getTypenameFromQuery(table.view.target?.query.ast) === Person.Person.typename,
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
                const id = Obj.getDXN(view).toString();
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
