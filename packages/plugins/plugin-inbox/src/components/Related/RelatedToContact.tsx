//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Function from 'effect/Function';
import React, { useCallback } from 'react';

import { Common, createIntent } from '@dxos/app-framework';
import { type SurfaceComponentProps, useIntentDispatcher } from '@dxos/app-framework/react';
import { Filter, Obj } from '@dxos/echo';
import { AttentionAction } from '@dxos/plugin-attention/types';
import { useActiveSpace } from '@dxos/plugin-space';
import { useQuery, useQueue } from '@dxos/react-client/echo';
import { Event, Message, type Person } from '@dxos/types';

import { Calendar, Mailbox } from '../../types';

import { RelatedEvents } from './RelatedEvents';
import { RelatedMessages } from './RelatedMessages';

export const RelatedToContact = ({ subject: contact }: SurfaceComponentProps<Person.Person>) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const space = useActiveSpace();
  const [mailbox] = useQuery(space?.db, Filter.type(Mailbox.Mailbox));
  const [calendar] = useQuery(space?.db, Filter.type(Calendar.Calendar));
  const messageQueue = useQueue(mailbox?.queue.dxn);
  const eventQueue = useQueue(calendar?.queue.dxn);
  const messages = useQuery(messageQueue, Filter.type(Message.Message));
  const events = useQuery(eventQueue, Filter.type(Event.Event));
  const relatedMessages = messages
    .filter(
      (message) =>
        contact.emails?.some((email) => email.value === message.sender.email) ||
        message.sender.contact?.target === contact,
    )
    .filter((message) => message.properties?.subject)
    .toSorted((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
    .slice(0, 5);
  const now = Date.now();
  const [recentEvents, upcomingEvents] = Function.pipe(
    events,
    Array.filter(
      (event) =>
        event.attendees?.some((attendee) => contact.emails?.some((email) => email.value === attendee.email)) ||
        event.attendees?.some((attendee) => attendee.contact?.target === contact),
    ),
    Array.partition((event) => new Date(event.startDate).getTime() > now),
  );
  const sortedRecentEvents = recentEvents
    .toSorted((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    .slice(0, 3);
  const sortedUpcomingEvents = upcomingEvents
    .toSorted((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 3);

  const handleMessageClick = useCallback(
    async (message: Message.Message) => {
      await dispatch(
        createIntent(Common.LayoutAction.UpdatePopover, {
          part: 'popover',
          options: {
            state: false,
            anchorId: '',
          },
        }),
      );
      await dispatch(
        createIntent(Common.LayoutAction.Open, {
          part: 'main',
          subject: [Obj.getDXN(mailbox).toString()],
          options: { workspace: space?.id },
        }),
      );
      await dispatch(
        createIntent(AttentionAction.Select, {
          contextId: Obj.getDXN(mailbox).toString(),
          selection: { mode: 'single', id: message.id },
        }),
      );
    },
    [dispatch, space, mailbox],
  );

  const handleEventClick = useCallback(
    async (event: Event.Event) => {
      await dispatch(
        createIntent(Common.LayoutAction.UpdatePopover, {
          part: 'popover',
          options: {
            state: false,
            anchorId: '',
          },
        }),
      );
      await dispatch(
        createIntent(Common.LayoutAction.Open, {
          part: 'main',
          subject: [Obj.getDXN(calendar).toString()],
          options: { workspace: space?.id },
        }),
      );
      await dispatch(
        createIntent(AttentionAction.Select, {
          contextId: Obj.getDXN(calendar).toString(),
          selection: { mode: 'single', id: event.id },
        }),
      );
    },
    [dispatch, space, calendar],
  );

  return (
    <>
      <RelatedMessages messages={relatedMessages} onMessageClick={handleMessageClick} />
      <RelatedEvents recent={sortedRecentEvents} upcoming={sortedUpcomingEvents} onEventClick={handleEventClick} />
    </>
  );
};
