//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import { addDays } from 'date-fns';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { type Resolver } from '@dxos/extractor';
import * as InboxResolver from '@dxos/extractor-lib';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { Pipeline, Stage } from '@dxos/pipeline';

import { GoogleCalendar } from '../../../apis';
import { GOOGLE_INTEGRATION_SOURCE } from '../../../constants';
import { GoogleCredentials } from '../../../services';
import { Calendar, InboxOperation } from '../../../types';
import { mapEvent } from './mapper';

const COMMIT_PAGE_SIZE = 10;

const DEFAULT_SYNC_BACK_DAYS = 30;
const DEFAULT_SYNC_FORWARD_DAYS = 365;
const DEFAULT_PAGE_SIZE = 100;

export default InboxOperation.GoogleCalendarSync.pipe(
  Operation.withHandler(
    ({
      binding: bindingRef,
      googleCalendarId = 'primary',
      syncBackDays = DEFAULT_SYNC_BACK_DAYS,
      syncForwardDays = DEFAULT_SYNC_FORWARD_DAYS,
      pageSize = DEFAULT_PAGE_SIZE,
    }) =>
      Effect.gen(function* () {
        const bindingObj = bindingRef.target;
        const db = bindingObj ? Obj.getDatabase(bindingObj) : undefined;
        if (!bindingObj || !db || !Cursor.isExternal(bindingObj)) {
          return { newEvents: 0 };
        }

        const accessTokenRef = bindingObj.spec.source;
        const defaults = { googleCalendarId, syncBackDays, syncForwardDays, pageSize };

        return yield* Effect.gen(function* () {
          const binding = yield* Database.load(bindingRef);
          if (!Cursor.isExternal(binding)) {
            return { newEvents: 0 };
          }
          const calendar = yield* Database.load(binding.spec.target);
          if (!Calendar.instanceOf(calendar)) {
            // The integration mechanism only ever binds Calendars for Google Calendar.
            return { newEvents: 0 };
          }

          const feed = yield* Database.load(calendar.feed);
          const fk = Obj.getMeta(calendar).keys?.find((k) => k.source === GOOGLE_INTEGRATION_SOURCE);
          const calendarId = fk?.id ?? binding.spec.externalId ?? defaults.googleCalendarId;
          const optRecord = binding.spec.options ?? {};
          const syncBack = typeof optRecord.syncBackDays === 'number' ? optRecord.syncBackDays : defaults.syncBackDays;
          const syncForward =
            typeof optRecord.syncForwardDays === 'number' ? optRecord.syncForwardDays : defaults.syncForwardDays;
          const searchFilter = typeof optRecord.filter === 'string' ? optRecord.filter : undefined;

          // The cursor is the event `updated` high-water mark (stored ISO, compared as epoch-ms). A
          // missing cursor means initial sync (window by start time); otherwise incremental
          // (by `updatedMin`).
          const cursorKey = typeof binding.value === 'string' ? Date.parse(binding.value) : 0;
          const isInitialSync = cursorKey === 0;
          log('syncing google calendar', { calendar: Obj.getURI(calendar), calendarId, isInitialSync });

          const stats: Cursor.Stats = { newMessages: 0 };
          yield* calendarSource(calendarId, cursorKey, {
            syncBackDays: syncBack,
            syncForwardDays: syncForward,
            pageSize: defaults.pageSize,
            searchFilter,
          }).pipe(
            Cursor.dedupStage<GoogleCalendar.Event>(
              'dedup',
              (event) => event.id,
              (event) => (event.updated ? Date.parse(event.updated) : 0),
            ),
            makeRecurringDedupStage(isInitialSync),
            mapEventStage,
            Stream.grouped(COMMIT_PAGE_SIZE),
            Pipeline.run({ sink: Cursor.commit }),
            Effect.provide(
              Cursor.layer({
                cursor: binding,
                feed,
                foreignKeySource: GOOGLE_INTEGRATION_SOURCE,
                cursorKey,
                // Store the cursor as an ISO `updated` timestamp (used as `updatedMin` next run).
                formatCursor: (key) => new Date(key).toISOString(),
                stats,
              }),
            ),
          );

          // Flush indexes once at the end of the run (per-page commits no longer flush — see
          // `Cursor.commit`) so cross-run dedup / resolution observe this run's writes.
          yield* Database.flush({ indexes: true });

          log('calendar sync complete', { newEvents: stats.newMessages, isInitialSync });
          return { newEvents: stats.newMessages };
        }).pipe(
          Effect.provide(
            Layer.mergeAll(
              FetchHttpClient.layer,
              InboxResolver.Live,
              GoogleCredentials.fromAccessToken(accessTokenRef),
              Database.layer(db),
            ),
          ),
        );
      }),
  ),
  Operation.opaqueHandler,
);

/** Maps a Google event to a commit unit (event → feed). Resolves attendees via `Resolver`; drops
 * cancelled/start-less events (mapEvent returns null). Events carry no tags or extracted objects. */
const mapEventStage: Stage.Stage<GoogleCalendar.Event, Cursor.CommitUnit, never, Resolver> = Stage.map(
  'map-event',
  (event: GoogleCalendar.Event) =>
    mapEvent(event).pipe(
      Effect.map((mapped) =>
        mapped
          ? {
              object: mapped,
              foreignId: event.id,
              key: event.updated ? Date.parse(event.updated) : 0,
            }
          : undefined,
      ),
    ),
);

/** Drops repeat instances of a recurring series (keeps the first), matching the initial-sync dedup.
 * A no-op for incremental sync, where `listEventsByUpdated` returns series masters. */
const makeRecurringDedupStage = (enabled: boolean): Stage.Stage<GoogleCalendar.Event, GoogleCalendar.Event> => {
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

/** Streams Google Calendar events: initial sync windows by start time, incremental by `updatedMin`. */
const calendarSource = (
  calendarId: string,
  cursorKey: number,
  opts: { syncBackDays: number; syncForwardDays: number; pageSize: number; searchFilter?: string },
) => {
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
