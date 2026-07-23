//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Function from 'effect/Function';
import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { type AppSurface, useCardPivot } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { Card } from '@dxos/react-ui';
import { Event, Message, type Person } from '@dxos/types';

import { RelatedEvents, RelatedMessages } from '#components';
import { Calendar, Mailbox } from '#types';

import { getCalendarEventPath, getMailboxMessagePath } from '../../paths';

export type RelatedToContactProps = AppSurface.ObjectArticleProps<Person.Person>;

export const RelatedToContact = ({ subject: contact }: RelatedToContactProps) => {
  const { invokePromise } = useOperationInvoker();
  const [cardRef, getPivotId] = useCardPivot();
  const db = Obj.getDatabase(contact);
  const workspace = db ? Paths.getSpacePath(db.spaceId) : undefined;
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
      // A card always opens beside the plank it lives in, never replacing it. `immediate` skips the
      // existence check: the message is a feed object (absent from `space.db`, so the loader can't
      // confirm it), but the card already holds it — expanding the mailbox chain materializes its node.
      await invokePromise(LayoutOperation.Open, {
        subject: [messagePath],
        pivotId: getPivotId(),
        disposition: 'add',
        navigation: 'immediate',
        workspace,
      });
    },
    [invokePromise, workspace, getPivotId, db, mailbox],
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
      // A card always opens beside the plank it lives in, never replacing it. `immediate` skips the
      // existence check: the event is a feed object (absent from `space.db`, so the loader can't confirm
      // it), but the card already holds it — expanding the calendar chain materializes its node.
      await invokePromise(LayoutOperation.Open, {
        subject: [eventPath],
        pivotId: getPivotId(),
        disposition: 'add',
        navigation: 'immediate',
        workspace,
      });
    },
    [invokePromise, workspace, getPivotId, db, calendar],
  );

  return (
    <Card.Body ref={cardRef}>
      <RelatedMessages messages={relatedMessages} onMessageClick={handleMessageClick} />
      <RelatedEvents recent={sortedRecentEvents} upcoming={sortedUpcomingEvents} onEventClick={handleEventClick} />
    </Card.Body>
  );
};

RelatedToContact.displayName = 'RelatedToContact';
