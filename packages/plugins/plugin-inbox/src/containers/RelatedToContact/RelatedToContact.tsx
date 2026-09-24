//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Function from 'effect/Function';
import * as Result from 'effect/Result';
import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type AppSurface, useCardPivot } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { Card } from '@dxos/react-ui';
import { Event, Message, type Person } from '@dxos/types';

import { RelatedEvents, RelatedMessages, messageDigest } from '#components';
import { Calendar, Mailbox } from '#types';

import { getCalendarEventPath, getMailboxMessagePath } from '../../paths.ts';

export type RelatedToContactProps = AppSurface.ObjectArticleProps<Person.Person>;

export const RelatedToContact = ({ subject: contact }: RelatedToContactProps) => {
  const { invokePromise } = useOperationInvoker();
  const [cardRef, pivotId] = useCardPivot();
  const db = Obj.getDatabase(contact);
  const workspace = db ? GraphPath.getSpacePath(db.spaceId) : undefined;
  const mailboxes = useQuery(db, Filter.type(Mailbox.Mailbox));
  const calendars = useQuery(db, Filter.type(Calendar.Calendar));

  const mailbox = mailboxes[0];
  const calendar = calendars[0];
  // TODO(wittjosiah): Should be `const feed = useObjectValue(mailbox.feed)`.
  useObject(mailbox);
  useObject(calendar);

  const mailboxFeed = mailbox?.feed?.target;
  const calendarFeed = calendar?.feed?.target;
  // The conditional query has a union type that loses inference; reassert the element type.
  const messages = useQuery(
    db,
    mailboxFeed ? Query.select(Filter.type(Message.Message)).from(mailboxFeed) : Query.select(Filter.nothing()),
  ) as Message.Message[];
  const events = useQuery(
    db,
    calendarFeed ? Query.select(Filter.type(Event.Event)).from(calendarFeed) : Query.select(Filter.nothing()),
  ) as Event.Event[];
  // Summaries live on a SECOND feed (`mailbox.annotations`), so they need their own query — the
  // message feed carries none. Absent pipeline output the rows fall back to the provider snippet.
  const annotationFeed = mailbox?.annotations?.target;
  const annotations = useQuery(
    db,
    annotationFeed ? Query.select(Filter.type(Message.Message)).from(annotationFeed) : Query.select(Filter.nothing()),
  ) as Message.Message[];
  const summaries = useMemo(() => Mailbox.summaryIndex(annotations), [annotations]);

  const relatedMessages = messages
    .filter(
      (message) =>
        contact.emails?.some((email) => email.value === message.sender.email) ||
        message.sender.contact?.target === contact,
    )
    // Keep only rows that can say something: a summary, a snippet, or a subject.
    .filter((message) => messageDigest(message, summaries) !== undefined)
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
    // v4's `partition` takes a `Result`-returning filter; `[excluded, satisfying]` is unchanged.
    Array.partition((event) =>
      new Date(event.startDate).getTime() > now ? Result.succeed(event) : Result.fail(event),
    ),
  );
  const sortedRecentEvents = recentEvents
    .toSorted((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    .slice(0, 3);
  const sortedUpcomingEvents = upcomingEvents
    .toSorted((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 3);

  // Open the message directly as its own (standalone) plank, not the mailbox with the message selected.
  const handleMessageClick = useCallback(
    async (message: Message.Message) => {
      if (!db || !mailbox) {
        return;
      }
      // A message is a feed object under its mailbox; address it via the `message` key, not the generic
      // database path (which does not resolve for feed objects).
      const messagePath = getMailboxMessagePath(db.spaceId, mailbox.id, message.id);
      await invokePromise(LayoutOperation.UpdatePopover, { state: false, anchorId: '' });
      await invokePromise(LayoutOperation.Open, {
        subject: [messagePath],
        pivotId,
        disposition: 'add',
        navigation: 'immediate',
        workspace,
      });
    },
    [invokePromise, workspace, pivotId, db, mailbox],
  );

  // Open the event directly as its own (standalone) plank, not the calendar with the event selected.
  const handleEventClick = useCallback(
    async (event: Event.Event) => {
      if (!db || !calendar) {
        return;
      }
      // An event is a feed object under its calendar; address it via the `event` key, not the generic
      // database path (which does not resolve for feed objects).
      const eventPath = getCalendarEventPath(db.spaceId, calendar.id, event.id);
      await invokePromise(LayoutOperation.UpdatePopover, { state: false, anchorId: '' });
      await invokePromise(LayoutOperation.Open, {
        subject: [eventPath],
        pivotId,
        disposition: 'add',
        navigation: 'immediate',
        workspace,
      });
    },
    [invokePromise, workspace, pivotId, db, calendar],
  );

  return (
    <Card.Body ref={cardRef}>
      <RelatedMessages messages={relatedMessages} summaries={summaries} onMessageClick={handleMessageClick} />
      <RelatedEvents recent={sortedRecentEvents} upcoming={sortedUpcomingEvents} onEventClick={handleEventClick} />
    </Card.Body>
  );
};

RelatedToContact.displayName = 'RelatedToContact';
