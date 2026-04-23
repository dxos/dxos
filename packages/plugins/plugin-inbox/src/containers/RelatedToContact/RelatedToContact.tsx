//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Function from 'effect/Function';
import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, getObjectPathFromObject, getSpacePath } from '@dxos/app-toolkit';
import { useActiveSpace, type AppSurface } from '@dxos/app-toolkit/ui';
import { type Feed, Filter, Query } from '@dxos/echo';
import { AttentionOperation } from '@dxos/plugin-attention/operations';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Event, Message, type Person } from '@dxos/types';

import { RelatedEvents, RelatedMessages } from '#components';
import { Calendar, Mailbox } from '#types';

export const RelatedToContact = ({ subject: contact }: AppSurface.ObjectArticleProps<Person.Person>) => {
  const { invokePromise } = useOperationInvoker();
  const space = useActiveSpace();
  const mailboxes = useQuery(space?.db, Filter.type(Mailbox.Mailbox));
  const calendars = useQuery(space?.db, Filter.type(Calendar.Calendar));
  const mailbox = mailboxes[0];
  const calendar = calendars[0];
  // TODO(wittjosiah): Should be `const feed = useObjectValue(mailbox.feed)`.
  useObject(mailbox);
  useObject(calendar);
  const mailboxFeed = mailbox?.feed?.target as Feed.Feed | undefined;
  const calendarFeed = calendar?.feed?.target as Feed.Feed | undefined;
  // TODO(wittjosiah): Way to structure this query that does not require type assertions?
  const messages: Message.Message[] = useQuery(
    space?.db,
    mailboxFeed ? Query.select(Filter.type(Message.Message)).from(mailboxFeed) : Query.select(Filter.nothing()),
  ) as Message.Message[];
  const events: Event.Event[] = useQuery(
    space?.db,
    calendarFeed ? Query.select(Filter.type(Event.Event)).from(calendarFeed) : Query.select(Filter.nothing()),
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
      const mailboxPath = getObjectPathFromObject(mailbox);
      await invokePromise(LayoutOperation.UpdatePopover, { state: false, anchorId: '' });
      await invokePromise(LayoutOperation.Open, {
        subject: [mailboxPath],
        workspace: space ? getSpacePath(space.id) : undefined,
      });
      await invokePromise(AttentionOperation.Select, {
        contextId: mailboxPath,
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
      const calendarPath = getObjectPathFromObject(calendar);
      await invokePromise(LayoutOperation.UpdatePopover, { state: false, anchorId: '' });
      await invokePromise(LayoutOperation.Open, {
        subject: [calendarPath],
        workspace: space ? getSpacePath(space.id) : undefined,
      });
      await invokePromise(AttentionOperation.Select, {
        contextId: calendarPath,
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
