//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Filter, Query, Ref } from '@dxos/echo';
import { DatabaseService } from '@dxos/functions';
import { Event, Person } from '@dxos/types';

import { type GoogleCalendar } from '../../apis';

/**
 * Transforms Google Calendar event to ECHO event object.
 */
export const mapEvent: (event: GoogleCalendar.Event) => Effect.Effect<Event.Event | null, never, DatabaseService> =
  Effect.fn(function* (event: GoogleCalendar.Event) {
    // Skip cancelled events.
    if (event.status === 'cancelled') {
      return null;
    }

    // Skip events without start time.
    if (!event.start.dateTime && !event.start.date) {
      return null;
    }

    const startDate = event.start.dateTime || event.start.date!;
    const endDate = event.end?.dateTime || event.end?.date || startDate;

    // Parse organizer/owner.
    const owner = event.organizer?.email
      ? {
          email: event.organizer.email,
          name: event.organizer.displayName,
        }
      : undefined;

    const { objects: contacts } = yield* DatabaseService.runQuery(Query.select(Filter.type(Person.Person)));

    // Parse attendees.
    const attendees = (event.attendees || [])
      .filter((a) => a.email)
      .map((a) => {
        const contact = contacts.find(({ emails }) => {
          if (!emails) {
            return false;
          }

          return emails.findIndex(({ value }) => value === a.email) !== -1;
        });

        return {
          email: a.email,
          name: a.displayName,
          contact: contact && Ref.make(contact),
        };
      });

    return Event.make({
      title: event.summary || '(No title)',
      owner: owner!,
      attendees,
      startDate,
      endDate,
    });
  });
