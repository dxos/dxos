//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Function from 'effect/Function';
import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query, Type } from '@dxos/echo';
import { AttentionOperation } from '@dxos/plugin-attention/types';
import { useActiveSpace } from '@dxos/plugin-space';
import { useQuery } from '@dxos/react-client/echo';
import { Event, Message, type Person } from '@dxos/types';

import { RelatedEvents, RelatedMessages } from '../../components';
import { Calendar, Mailbox } from '../../types';

export const RelatedToContact = ({ subject: contact }: SurfaceComponentProps<Person.Person>) => {
  const { invokePromise } = useOperationInvoker();
  const space = useActiveSpace();
  const feeds = useQuery(space?.db, Filter.type(Type.Feed));
  const mailbox = feeds.find((f) => f.kind === Mailbox.kind);
  const calendar = feeds.find((f) => f.kind === Calendar.kind);
  // TODO(wittjosiah): Way to structure this query that does not require type assertions?
  const messages: Message.Message[] = useQuery(
    space?.db,
    mailbox ? Query.select(Filter.type(Message.Message)).from(mailbox) : Query.select(Filter.nothing()),
  ) as Message.Message[];
  const events: Event.Event[] = useQuery(
    space?.db,
    calendar ? Query.select(Filter.type(Event.Event)).from(calendar) : Query.select(Filter.nothing()),
  ) as Event.Event[];
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
      if (!mailbox) {
        return;
      }
      await invokePromise(LayoutOperation.UpdatePopover, { state: false, anchorId: '' });
      await invokePromise(LayoutOperation.Open, {
        subject: [Obj.getDXN(mailbox).toString()],
        workspace: space?.id,
      });
      await invokePromise(AttentionOperation.Select, {
        contextId: Obj.getDXN(mailbox).toString(),
        selection: { mode: 'single', id: message.id },
      });
    },
    [invokePromise, space, mailbox],
  );

  const handleEventClick = useCallback(
    async (event: Event.Event) => {
      if (!calendar) {
        return;
      }
      await invokePromise(LayoutOperation.UpdatePopover, { state: false, anchorId: '' });
      await invokePromise(LayoutOperation.Open, {
        subject: [Obj.getDXN(calendar).toString()],
        workspace: space?.id,
      });
      await invokePromise(AttentionOperation.Select, {
        contextId: Obj.getDXN(calendar).toString(),
        selection: { mode: 'single', id: event.id },
      });
    },
    [invokePromise, space, calendar],
  );

  return (
    <>
      <RelatedMessages messages={relatedMessages} onMessageClick={handleMessageClick} />
      <RelatedEvents recent={sortedRecentEvents} upcoming={sortedUpcomingEvents} onEventClick={handleEventClick} />
    </>
  );
};
