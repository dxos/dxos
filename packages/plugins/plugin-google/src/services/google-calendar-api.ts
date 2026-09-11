//
// Copyright 2026 DXOS.org
//

import type * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as Schema from 'effect/Schema';
import type * as HttpClient from 'effect/unstable/http/HttpClient';
import type * as HttpClientError from 'effect/unstable/http/HttpClientError';

import * as Credential from '@dxos/compute/Credential';

import { GoogleCalendar } from '#apis';

import { GoogleApiError } from '../errors.ts';
import { GoogleCredentials } from './google-credentials.ts';

/**
 * The requirements the underlying {@link GoogleCalendar} request functions carry (auth token + HTTP
 * client). {@link GoogleCalendarApi.Live} bakes these in so the service methods themselves require
 * nothing — which is what lets a test satisfy {@link GoogleCalendarApi} with a zero-dependency mock.
 */
type Requirements = HttpClient.HttpClient | GoogleCredentials | Credential.CredentialsService;

/** The failure modes shared by every {@link GoogleCalendar} request. Mirrors `GoogleMailApiError`. */
export type GoogleCalendarApiError =
  | GoogleApiError
  | HttpClientError.HttpClientError
  | Cause.TimeoutError
  | Schema.SchemaError;

/**
 * Swappable Google Calendar API surface, the calendar peer of `GoogleMailApi`. Two jobs, and the
 * second is the one that is easy to miss:
 *
 * 1. `Live` bakes in the auth/HTTP context (see {@link Requirements}) so every method is
 *    requirement-free — callers declare `GoogleCalendarApi` alone instead of propagating
 *    `HttpClient | GoogleCredentials | CredentialsService` through each signature.
 * 2. That same tag lets a test provide {@link GoogleCalendarApi.mock}, so calendar sync runs against
 *    generated events with no live account.
 */
export interface GoogleCalendarApiService {
  readonly listEventsByStartTime: (
    calendarId: string,
    timeMin: string,
    timeMax: string,
    pageSize: number,
    pageToken?: string,
    searchQuery?: string,
  ) => Effect.Effect<GoogleCalendar.ListEventsResponse, GoogleCalendarApiError>;
  readonly listEventsByUpdated: (
    calendarId: string,
    updatedMin: string,
    pageSize: number,
    pageToken?: string,
    searchQuery?: string,
  ) => Effect.Effect<GoogleCalendar.ListEventsResponse, GoogleCalendarApiError>;
  readonly getEvent: (
    calendarId: string,
    eventId: string,
  ) => Effect.Effect<GoogleCalendar.Event, GoogleCalendarApiError>;
  readonly createEvent: (
    calendarId: string,
    event: GoogleCalendar.CreateEventRequest,
  ) => Effect.Effect<GoogleCalendar.Event, GoogleCalendarApiError>;
  readonly deleteEvent: (calendarId: string, eventId: string) => Effect.Effect<void, GoogleCalendarApiError>;
}

/** In-memory events a {@link GoogleCalendarApi.mock} serves, keyed by calendar id. */
export interface CalendarDataset {
  /** Events per calendar id, in any order — the mock applies the window and ordering each list uses. */
  readonly events: Readonly<Record<string, readonly GoogleCalendar.Event[]>>;
}

/** Start instant of an event, whether timed (`dateTime`) or all-day (`date`). */
const startMs = (event: GoogleCalendar.Event): number => {
  const value = event.start.dateTime ?? event.start.date;
  return value ? new Date(value).getTime() : 0;
};

const updatedMs = (event: GoogleCalendar.Event): number => (event.updated ? new Date(event.updated).getTime() : 0);

/** Applies `pageToken` (an integer offset) + `pageSize` the way the real paging does. */
const paginate = (
  events: readonly GoogleCalendar.Event[],
  pageSize: number,
  pageToken: string | undefined,
): GoogleCalendar.ListEventsResponse => {
  const offset = pageToken ? Number.parseInt(pageToken, 10) : 0;
  const page = events.slice(offset, offset + pageSize);
  const nextOffset = offset + page.length;
  return {
    items: page,
    nextPageToken: nextOffset < events.length ? String(nextOffset) : undefined,
  };
};

export class GoogleCalendarApi extends Context.Service<GoogleCalendarApi, GoogleCalendarApiService>()(
  '@dxos/plugin-google/GoogleCalendarApi',
) {
  /**
   * Live layer backed by the real Calendar HTTP client. Captures the auth/HTTP context once and
   * provides it to each request, so the resulting service methods carry no requirements.
   */
  static readonly Live: Layer.Layer<GoogleCalendarApi, never, Requirements> = Layer.effect(
    GoogleCalendarApi,
    Effect.gen(function* () {
      const context = yield* Effect.context<Requirements>();
      const service: GoogleCalendarApiService = {
        listEventsByStartTime: (calendarId, timeMin, timeMax, pageSize, pageToken, searchQuery) =>
          Effect.provide(
            GoogleCalendar.listEventsByStartTime(calendarId, timeMin, timeMax, pageSize, pageToken, searchQuery),
            context,
          ),
        listEventsByUpdated: (calendarId, updatedMin, pageSize, pageToken, searchQuery) =>
          Effect.provide(
            GoogleCalendar.listEventsByUpdated(calendarId, updatedMin, pageSize, pageToken, searchQuery),
            context,
          ),
        getEvent: (calendarId, eventId) => Effect.provide(GoogleCalendar.getEvent(calendarId, eventId), context),
        createEvent: (calendarId, event) => Effect.provide(GoogleCalendar.createEvent(calendarId, event), context),
        deleteEvent: (calendarId, eventId) => Effect.provide(GoogleCalendar.deleteEvent(calendarId, eventId), context),
      };
      return service;
    }),
  );

  /**
   * Zero-dependency mock backed by an in-memory {@link CalendarDataset} — for tests that drive the real
   * sync pipeline with no live account. Both list methods honour their window, ordering and paging, so
   * the sync's forward walk and pagination exercise realistically.
   */
  static readonly mock = (dataset: CalendarDataset): Layer.Layer<GoogleCalendarApi> => {
    const eventsFor = (calendarId: string) => dataset.events[calendarId] ?? [];
    const findEvent = (calendarId: string, eventId: string) =>
      eventsFor(calendarId).find((event) => event.id === eventId);

    return Layer.succeed(
      GoogleCalendarApi,
      GoogleCalendarApi.of({
        listEventsByStartTime: (calendarId, timeMin, timeMax, pageSize, pageToken) =>
          Effect.sync(() => {
            const min = new Date(timeMin).getTime();
            const max = new Date(timeMax).getTime();
            const matching = eventsFor(calendarId)
              .filter((event) => startMs(event) >= min && startMs(event) < max)
              // The real API returns `orderBy=startTime` ascending.
              .sort((left, right) => startMs(left) - startMs(right));
            return paginate(matching, pageSize, pageToken);
          }),
        listEventsByUpdated: (calendarId, updatedMin, pageSize, pageToken) =>
          Effect.sync(() => {
            const since = new Date(updatedMin).getTime();
            const matching = eventsFor(calendarId)
              .filter((event) => updatedMs(event) >= since)
              .sort((left, right) => updatedMs(left) - updatedMs(right));
            return paginate(matching, pageSize, pageToken);
          }),
        getEvent: (calendarId, eventId) =>
          Effect.suspend(() => {
            const event = findEvent(calendarId, eventId);
            return event
              ? Effect.succeed(event)
              : Effect.fail(new GoogleApiError(404, `No such event: ${calendarId}/${eventId}`));
          }),
        createEvent: (_calendarId, event) =>
          Effect.succeed({
            id: `created-${event.summary ?? 'event'}`,
            summary: event.summary,
            description: event.description,
            location: event.location,
            start: event.start,
            end: event.end,
            attendees: event.attendees,
          }),
        deleteEvent: () => Effect.void,
      }),
    );
  };
}
