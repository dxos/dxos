//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Event } from '@dxos/types';

import { createUrl, makeGoogleApiRequest } from '../google-api';

import { CalendarEvent, EventsResponse } from './types';

/**
 * Google Calendar API.
 * https://developers.google.com/calendar/api/v3/reference
 */
const API_URL = 'https://www.googleapis.com/calendar/v3';

/**
 * Lists events on the specified calendar ordered by start time.
 * Used for initial sync to get all future events in chronological order.
 * https://developers.google.com/calendar/api/v3/reference/events/list
 */
export const listEventsByStartTime = Effect.fn(function* (
  calendarId: string,
  timeMin: string,
  timeMax: string,
  pageSize: number,
  pageToken?: string | undefined,
) {
  const url = createUrl([API_URL, 'calendars', encodeURIComponent(calendarId), 'events'], {
    timeMin,
    timeMax,
    maxResults: pageSize,
    pageToken,
    singleEvents: true,
    orderBy: 'startTime',
  }).toString();
  return yield* makeGoogleApiRequest(url).pipe(Effect.flatMap(Schema.decodeUnknown(EventsResponse)));
});

/**
 * Lists events on the specified calendar ordered by update time.
 * Used for subsequent syncs to catch all event updates and new invites.
 * This ensures we don't miss new invites for dates we've already synced.
 * https://developers.google.com/calendar/api/v3/reference/events/list
 */
export const listEventsByUpdated = Effect.fn(function* (
  calendarId: string,
  updatedMin: string,
  pageSize: number,
  pageToken?: string | undefined,
) {
  const url = createUrl([API_URL, 'calendars', encodeURIComponent(calendarId), 'events'], {
    updatedMin,
    maxResults: pageSize,
    pageToken,
    singleEvents: true,
    orderBy: 'updated',
  }).toString();
  return yield* makeGoogleApiRequest(url).pipe(Effect.flatMap(Schema.decodeUnknown(EventsResponse)));
});

/**
 * Gets the specified event.
 * https://developers.google.com/calendar/api/v3/reference/events/get
 */
export const getEvent = Effect.fn(function* (calendarId: string, eventId: string) {
  const url = createUrl([API_URL, 'calendars', encodeURIComponent(calendarId), 'events', eventId]).toString();
  return yield* makeGoogleApiRequest(url).pipe(Effect.flatMap(Schema.decodeUnknown(CalendarEvent)));
});

/**
 * Transforms Google Calendar event to ECHO event object.
 */
export const eventToObject = () =>
  Effect.fn(function* (event: CalendarEvent) {
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
