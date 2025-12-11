//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Filter, Query, Ref } from '@dxos/echo';
import { Database } from '@dxos/echo';
import { Event, Person } from '@dxos/types';

import { type GoogleCalendar } from '../../apis';
import { normalizeText } from '../../util';

/**
 * Maps Google Calendar event to ECHO event object.
 */
export const mapEvent: (event: GoogleCalendar.Event) => Effect.Effect<Event.Event | null, never, Database.Service> =
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

    // TODO(burdon): Breaks unit tests; factor out "resolvers" (create data toolkit).
    // TODO(burdon): Expensive to run on each map.
    const contacts = yield* Database.Service.runQuery(Query.select(Filter.type(Person.Person)));

    // Parse attendees.
    // TODO(burdon): Factor out in common with Gmail.
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
      title: event.summary,
      description: event.description && normalizeText(event.description),
      owner: owner!,
      attendees,
      startDate,
      endDate,
    });
  });
