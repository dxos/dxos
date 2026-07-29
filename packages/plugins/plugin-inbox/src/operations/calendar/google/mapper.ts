//
// Copyright 2025 DXOS.org
//

import { addDays, format } from 'date-fns';
import * as Effect from 'effect/Effect';

import { Obj, Ref } from '@dxos/echo';
import { type Resolver, resolve } from '@dxos/extractor';
import { normalizeText } from '@dxos/markdown';
import { Event, Person } from '@dxos/types';

import { GoogleCalendar } from '../../../apis';
import { GOOGLE_INTEGRATION_SOURCE } from '../../../constants';

/**
 * Maps Google Calendar event to ECHO event object.
 */
export const mapEvent: (event: GoogleCalendar.Event) => Effect.Effect<Event.Event | null, never, Resolver> = Effect.fn(
  function* (event: GoogleCalendar.Event) {
    // Skip cancelled events.
    if (event.status === 'cancelled') {
      return null;
    }

    // Skip events without start time.
    if (!event.start.dateTime && !event.start.date) {
      return null;
    }

    // All-day events use `date` (no `dateTime`); timed events use `dateTime`.
    const allDay = !event.start.dateTime && !!event.start.date;
    const startDate = event.start.dateTime || event.start.date!;
    const endDate = event.end?.dateTime || event.end?.date || startDate;

    // Parse organizer/owner. Keys with undefined values must be omitted entirely
    // because ECHO's DSON storage serializes undefined as null, which fails schema decode.
    const owner = event.organizer?.email
      ? {
          email: event.organizer.email,
          ...(event.organizer.displayName ? { name: event.organizer.displayName } : {}),
        }
      : undefined;

    // Parse attendees.
    const attendees = yield* Effect.all(
      (event.attendees || [])
        .filter((a) => a.email)
        .map((a) =>
          Effect.gen(function* () {
            const contact = yield* resolve(Person.Person, { email: a.email! });
            return {
              email: a.email!,
              ...(a.displayName ? { name: a.displayName } : {}),
              ...(contact ? { contact: Ref.make(contact) } : {}),
            };
          }),
        ),
    );

    return Event.make({
      // Stamp the remote id so synced events can be addressed for delete and deduped against local drafts.
      [Obj.Meta]: { keys: [{ source: GOOGLE_INTEGRATION_SOURCE, id: event.id }] },
      ...(event.summary ? { title: event.summary } : {}),
      ...(event.description ? { description: normalizeText(event.description) } : {}),
      ...(allDay ? { allDay: true } : {}),
      owner: owner!,
      attendees,
      startDate,
      endDate,
    });
  },
);

/** Formats an ISO timestamp as a `YYYY-MM-DD` calendar day (local) for all-day events. */
const toDateOnly = (iso: string): string => format(new Date(iso), 'yyyy-MM-dd');

/** Formats a postal address into the single-line `location` string Google Calendar expects. */
const formatLocation = (address: NonNullable<Event.Event['location']>): string | undefined => {
  const parts = [address.street, address.locality, address.region, address.postalCode, address.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : undefined;
};

/**
 * Maps a local ECHO Event onto a Google Calendar create-event request body. Inverse of {@link mapEvent}.
 */
export const toGoogleEvent = (event: Event.Event): GoogleCalendar.CreateEventRequest => ({
  ...(event.title ? { summary: event.title } : {}),
  ...(event.description ? { description: event.description } : {}),
  ...(event.location && formatLocation(event.location) ? { location: formatLocation(event.location) } : {}),
  // All-day events use `date` (Google treats `end.date` as exclusive, so add a day); timed use `dateTime`.
  ...(event.allDay
    ? {
        start: { date: toDateOnly(event.startDate) },
        end: { date: format(addDays(new Date(event.endDate), 1), 'yyyy-MM-dd') },
      }
    : {
        start: { dateTime: event.startDate },
        end: { dateTime: event.endDate },
      }),
  attendees: event.attendees
    .filter((attendee) => attendee.email)
    .map((attendee) => ({ email: attendee.email!, ...(attendee.name ? { displayName: attendee.name } : {}) })),
});
