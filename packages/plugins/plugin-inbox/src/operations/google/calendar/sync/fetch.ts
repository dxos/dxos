//
// Copyright 2025 DXOS.org
//

import { addDays } from 'date-fns';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import { GoogleCalendar } from '../../../../apis';

/**
 * The page-fetch effect's error + requirements (references `CredentialsService` via the Google API);
 * reused as the source stream's error/context so the exported type is nameable without a phantom
 * import (TS2883).
 */
export type CalendarPageEffect =
  | ReturnType<typeof GoogleCalendar.listEventsByStartTime>
  | ReturnType<typeof GoogleCalendar.listEventsByUpdated>;

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
): Stream.Stream<
  GoogleCalendar.Event,
  Effect.Effect.Error<CalendarPageEffect>,
  Effect.Effect.Context<CalendarPageEffect>
> => {
  const fetchPage = (pageToken: string | undefined) =>
    cursorKey === 0
      ? GoogleCalendar.listEventsByStartTime(
          calendarId,
          addDays(new Date(), -opts.syncBackDays).toISOString(),
          addDays(new Date(), opts.syncForwardDays).toISOString(),
          opts.pageSize,
          pageToken,
          opts.searchFilter,
        )
      : GoogleCalendar.listEventsByUpdated(
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

      const { items = [], nextPageToken } = yield* fetchPage(Option.getOrUndefined(state.pageToken));
      return Option.some([
        Chunk.fromIterable(items),
        { pageToken: Option.fromNullable(nextPageToken), done: !nextPageToken },
      ] as const);
    }),
  );
};
