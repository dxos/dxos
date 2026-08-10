//
// Copyright 2025 DXOS.org
//

import { addDays } from 'date-fns';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import { type GoogleCalendar } from '../../../apis';
import { GoogleCalendarApi, type GoogleCalendarApiError, type GoogleCalendarApiService } from '../../../services';

export type FetchEventsOptions = {
  syncBackDays: number;
  syncForwardDays: number;
  pageSize: number;
  searchFilter?: string;
};

/** Streams Google Calendar events: initial sync windows by start time, incremental by `updatedMin`. */
export const fetchEvents = (
  calendarId: string,
  cursorKey: number,
  opts: FetchEventsOptions,
): Stream.Stream<GoogleCalendar.Event, GoogleCalendarApiError, GoogleCalendarApi> => {
  const fetchPage = (api: GoogleCalendarApiService, pageToken: string | undefined) =>
    cursorKey === 0
      ? api.listEventsByStartTime(
          calendarId,
          addDays(new Date(), -opts.syncBackDays).toISOString(),
          addDays(new Date(), opts.syncForwardDays).toISOString(),
          opts.pageSize,
          pageToken,
          opts.searchFilter,
        )
      : api.listEventsByUpdated(
          calendarId,
          new Date(cursorKey).toISOString(),
          opts.pageSize,
          pageToken,
          opts.searchFilter,
        );

  return Stream.unfoldChunkEffect({ pageToken: Option.none<string>(), done: false }, (state) =>
    Effect.gen(function* () {
      if (state.done) {
        return Option.none();
      }

      const api = yield* GoogleCalendarApi;
      const { items = [], nextPageToken } = yield* fetchPage(api, Option.getOrUndefined(state.pageToken));
      return Option.some([
        Chunk.fromIterable(items),
        { pageToken: Option.fromNullable(nextPageToken), done: !nextPageToken },
      ] as const);
    }),
  );
};
