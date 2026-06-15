//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

// eslint-disable-next-line unused-imports/no-unused-imports
import type { Credential } from '@dxos/compute';

import { createUrl, makeGoogleApiRequest } from '../google-api';
import { DateTime, Event, ListEventsResponse } from './types';

/**
 * Google Calendar API.
 * https://developers.google.com/calendar/api/v3/reference
 */
const API_URL = 'https://www.googleapis.com/calendar/v3';

/**
 * Lists events on the specified calendar ordered by start time.
 * Used for initial sync to get all future events in chronological order.
 * Returns expanded instances of recurring events which can be deduplicated by recurringEventId.
 * https://developers.google.com/calendar/api/v3/reference/events/list
 */
export const listEventsByStartTime = Effect.fn(function* (
  calendarId: string,
  timeMin: string,
  timeMax: string,
  pageSize: number,
  pageToken?: string | undefined,
  /** Free-text Events.list `q` filter (optional provider search). */
  searchQuery?: string | undefined,
) {
  const url = createUrl([API_URL, 'calendars', encodeURIComponent(calendarId), 'events'], {
    timeMin,
    timeMax,
    maxResults: pageSize,
    pageToken,
    // NOTE: `singleEvents=false` is not compatible with `orderBy=startTime`.
    //   Expanded instances can be deduplicated downstream by recurringEventId.
    singleEvents: true,
    orderBy: 'startTime',
    ...(searchQuery ? { q: searchQuery } : {}),
  }).toString();
  return yield* makeGoogleApiRequest(url).pipe(Effect.flatMap(Schema.decodeUnknown(ListEventsResponse)));
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
  searchQuery?: string | undefined,
) {
  const url = createUrl([API_URL, 'calendars', encodeURIComponent(calendarId), 'events'], {
    updatedMin,
    maxResults: pageSize,
    pageToken,
    // Don't create individual instances of recurring events.
    singleEvents: false,
    orderBy: 'updated',
    ...(searchQuery ? { q: searchQuery } : {}),
  }).toString();
  return yield* makeGoogleApiRequest(url).pipe(Effect.flatMap(Schema.decodeUnknown(ListEventsResponse)));
});

/**
 * Gets the specified event.
 * https://developers.google.com/calendar/api/v3/reference/events/get
 */
export const getEvent = Effect.fn(function* (calendarId: string, eventId: string) {
  const url = createUrl([API_URL, 'calendars', encodeURIComponent(calendarId), 'events', eventId]).toString();
  return yield* makeGoogleApiRequest(url).pipe(Effect.flatMap(Schema.decodeUnknown(Event)));
});

/**
 * Request body for creating an event. A subset of the Google Calendar event resource.
 * https://developers.google.com/calendar/api/v3/reference/events/insert
 */
export const CreateEventRequest = Schema.Struct({
  summary: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  location: Schema.optional(Schema.String),
  start: DateTime,
  end: DateTime,
  attendees: Schema.optional(
    Schema.Array(Schema.Struct({ email: Schema.String, displayName: Schema.optional(Schema.String) })),
  ),
});

export type CreateEventRequest = Schema.Schema.Type<typeof CreateEventRequest>;

/**
 * Creates an event on the specified calendar (requires the `calendar.events` scope).
 * https://developers.google.com/calendar/api/v3/reference/events/insert
 */
export const createEvent = Effect.fn('createEvent')(function* (calendarId: string, event: CreateEventRequest) {
  const url = createUrl([API_URL, 'calendars', encodeURIComponent(calendarId), 'events']).toString();
  return yield* makeGoogleApiRequest(url, { method: 'POST', body: JSON.stringify(event) }).pipe(
    Effect.flatMap(Schema.decodeUnknown(Event)),
  );
});

/**
 * Deletes an event from the specified calendar (requires the `calendar.events` scope).
 * https://developers.google.com/calendar/api/v3/reference/events/delete
 */
export const deleteEvent = Effect.fn('deleteEvent')(function* (calendarId: string, eventId: string) {
  const url = createUrl([API_URL, 'calendars', encodeURIComponent(calendarId), 'events', eventId]).toString();
  yield* makeGoogleApiRequest(url, { method: 'DELETE' });
});
