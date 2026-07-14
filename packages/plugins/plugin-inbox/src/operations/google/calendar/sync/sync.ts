//
// Copyright 2025 DXOS.org
//

import { addDays } from 'date-fns';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import { type Resolver } from '@dxos/extractor';
import { Stage } from '@dxos/pipeline';
import { SyncBinding } from '@dxos/plugin-connector';

import { GoogleCalendar } from '../../../../apis';
import { mapEvent } from '../mapper';

/** Maps a Google event to a commit unit (event → feed). Resolves attendees via `Resolver`; drops
 * cancelled/start-less events (mapEvent returns null). Events carry no tags or extracted objects. */
export const mapEventStage: Stage.Stage<GoogleCalendar.Event, SyncBinding.CommitUnit, never, Resolver> = Stage.map(
  'map-event',
  (event: GoogleCalendar.Event) =>
    mapEvent(event).pipe(
      Effect.map((mapped) =>
        mapped
          ? {
              message: mapped,
              foreignId: event.id,
              key: event.updated ? Date.parse(event.updated) : 0,
              tagUris: [],
            }
          : undefined,
      ),
    ),
);

/** Drops repeat instances of a recurring series (keeps the first), matching the initial-sync dedup.
 * A no-op for incremental sync, where `listEventsByUpdated` returns series masters. */
export const makeRecurringDedupStage = (enabled: boolean): Stage.Stage<GoogleCalendar.Event, GoogleCalendar.Event> => {
  const seen = new Set<string>();
  return Stage.map('dedup-recurring', (event: GoogleCalendar.Event) =>
    Effect.sync(() => {
      if (!enabled || !event.recurringEventId) {
        return event;
      }
      if (seen.has(event.recurringEventId)) {
        return undefined;
      }
      seen.add(event.recurringEventId);
      return event;
    }),
  );
};

/** The page-fetch effect's error + requirements (references `CredentialsService` via the Google API);
 * reused as the source stream's error/context so the exported type is nameable without a phantom import (TS2883). */
type CalendarPageEffect =
  | ReturnType<typeof GoogleCalendar.listEventsByStartTime>
  | ReturnType<typeof GoogleCalendar.listEventsByUpdated>;

/** Streams Google Calendar events: initial sync windows by start time, incremental by `updatedMin`. */
export const getEvents = (
  calendarId: string,
  cursorKey: number,
  opts: { syncBackDays: number; syncForwardDays: number; pageSize: number; searchFilter?: string },
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
