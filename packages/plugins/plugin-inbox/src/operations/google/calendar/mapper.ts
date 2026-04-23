//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Ref } from '@dxos/echo';
import { Event, Person } from '@dxos/types';

import { type GoogleCalendar } from '../../../apis';
import * as Resolver from '../../../services/resolver';
import { normalizeText } from '../util';

/**
 * Maps Google Calendar event to ECHO event object.
 */
export const mapEvent: (event: GoogleCalendar.Event) => Effect.Effect<Event.Event | null, never, Resolver.Resolver> =
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
            const contact = yield* Resolver.resolve(Person.Person, { email: a.email! });
            return {
              email: a.email!,
              ...(a.displayName ? { name: a.displayName } : {}),
              ...(contact ? { contact: Ref.make(contact) } : {}),
            };
          }),
        ),
    );

    return Event.make({
      ...(event.summary ? { title: event.summary } : {}),
      ...(event.description ? { description: normalizeText(event.description) } : {}),
      owner: owner!,
      attendees,
      startDate,
      endDate,
    });
  });
