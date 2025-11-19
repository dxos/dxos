//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { createUrl, makeGoogleApiRequest } from '../google-api';

import { Event, ListEventsResponse } from './types';

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
    // Don't create individual instances of recurring events.
    singleEvents: false,
    orderBy: 'startTime',
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
) {
  const url = createUrl([API_URL, 'calendars', encodeURIComponent(calendarId), 'events'], {
    updatedMin,
    maxResults: pageSize,
    pageToken,
    // Don't create individual instances of recurring events.
    singleEvents: false,
    orderBy: 'updated',
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
