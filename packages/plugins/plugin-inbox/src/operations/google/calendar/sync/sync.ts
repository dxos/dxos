//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { Database, Obj, Ref } from '@dxos/echo';
import { type EntityNotFoundError } from '@dxos/echo/Err';
import { type Resolver } from '@dxos/extractor';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { Pipeline, Stage } from '@dxos/pipeline';

import { GoogleCalendar } from '../../../../apis';
import { GOOGLE_INTEGRATION_SOURCE } from '../../../../constants';
import { Calendar, type SyncStreamConfig } from '../../../../types';
import { mapEvent } from '../mapper';
import { type CalendarPageEffect, fetchEvents } from './fetch';

/**
 * Calendar's streaming-pipeline tuning; see {@link SyncStreamConfig}. The events list returns full
 * events and isn't capped/re-run, so it omits `fetchConcurrency` and `maxItemsPerRun`.
 */
const CALENDAR_SYNC_CONFIG = {
  listPageSize: 100,
  commitPageSize: 10,
} as const satisfies SyncStreamConfig;

// Default sync window (overridable via the binding's `spec.options`); distinct from the streaming
// config above — it bounds *which* events sync (by start time), not how they page.
const DEFAULT_SYNC_BACK_DAYS = 30;
const DEFAULT_SYNC_FORWARD_DAYS = 365;

/** Maps a Google event to a commit unit (event → feed). Resolves attendees via `Resolver`; drops
 * cancelled/start-less events (mapEvent returns null). Events carry no tags or extracted objects. */
export const mapEventStage: Stage.Stage<GoogleCalendar.Event, Cursor.CommitUnit, never, Resolver> = Stage.map(
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

export type SyncCalendarProps = {
  binding: Ref.Ref<Cursor.Cursor>;
  googleCalendarId?: string;
  syncBackDays?: number;
  syncForwardDays?: number;
  pageSize?: number;
};

/**
 * Runs the Google Calendar sync pipeline for a binding: fetch → dedup → drop recurring repeats → map to
 * commit units → commit each page (advancing the cursor). Requires the ambient services rather than
 * providing them, so a test can drive it against a mock API. The return type is written out so the
 * emitted `.d.ts` can name it without expanding the Google API's `CredentialsService` (TS2883).
 */
export const syncCalendar = ({
  binding: bindingRef,
  googleCalendarId = 'primary',
  syncBackDays = DEFAULT_SYNC_BACK_DAYS,
  syncForwardDays = DEFAULT_SYNC_FORWARD_DAYS,
  pageSize = CALENDAR_SYNC_CONFIG.listPageSize,
}: SyncCalendarProps): Effect.Effect<
  { newEvents: number },
  Effect.Effect.Error<CalendarPageEffect> | EntityNotFoundError,
  Database.Service | Resolver | Effect.Effect.Context<CalendarPageEffect>
> =>
  Effect.gen(function* () {
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
    const fk = Obj.getMeta(calendar).keys?.find((key) => key.source === GOOGLE_INTEGRATION_SOURCE);
    const calendarId = fk?.id ?? binding.spec.externalId ?? googleCalendarId;
    const optRecord = binding.spec.options ?? {};
    const syncBack = typeof optRecord.syncBackDays === 'number' ? optRecord.syncBackDays : syncBackDays;
    const syncForward = typeof optRecord.syncForwardDays === 'number' ? optRecord.syncForwardDays : syncForwardDays;
    const searchFilter = typeof optRecord.filter === 'string' ? optRecord.filter : undefined;

    // The cursor is the event `updated` high-water mark (stored ISO, compared as epoch-ms). A missing
    // cursor means initial sync (window by start time); otherwise incremental (by `updatedMin`).
    const cursorKey = typeof binding.max === 'string' ? Date.parse(binding.max) : 0;
    const isInitialSync = cursorKey === 0;
    log('syncing google calendar', { calendar: Obj.getURI(calendar), calendarId, isInitialSync });

    const stats: Cursor.Stats = { newMessages: 0 };
    yield* fetchEvents(calendarId, cursorKey, {
      syncBackDays: syncBack,
      syncForwardDays: syncForward,
      pageSize,
      searchFilter,
    }).pipe(
      Cursor.dedupStage<GoogleCalendar.Event>(
        'dedup',
        (event) => event.id,
        (event) => (event.updated ? Date.parse(event.updated) : 0),
      ),
      makeRecurringDedupStage(isInitialSync),
      mapEventStage,
      Stream.grouped(CALENDAR_SYNC_CONFIG.commitPageSize),
      Pipeline.run({ sink: Cursor.commit }),
      Effect.provide(
        Cursor.layer({
          cursor: binding,
          feed,
          foreignKeySource: GOOGLE_INTEGRATION_SOURCE,
          maxKey: cursorKey,
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
  });
