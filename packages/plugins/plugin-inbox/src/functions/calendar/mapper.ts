//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Event } from '@dxos/types';

import { type GoogleCalendar } from '../apis';

/**
 * Transforms Google Calendar event to ECHO event object.
 */
export const eventToObject = () =>
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

    // Parse attendees.
    const attendees = (event.attendees || [])
      .filter((a) => a.email)
      .map((a) => ({
        email: a.email!,
        name: a.displayName,
      }));

    return Event.make({
      name: event.summary || '(No title)',
      owner: owner!,
      attendees,
      startDate,
      endDate,
      links: [],
    });
  });
