//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import { addDays } from 'date-fns';
import * as Array from 'effect/Array';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Predicate from 'effect/Predicate';
import * as Ref from 'effect/Ref';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

import { ArtifactId } from '@dxos/assistant';
import { DXN } from '@dxos/echo';
import { Database } from '@dxos/echo';
import { QueueService, defineFunction } from '@dxos/functions';
import { log } from '@dxos/log';
import { type Event } from '@dxos/types';

// TODO(burdon): Importing from types/index.ts pulls in @dxos/client dependencies due to SpaceSchema.
import * as Calendar from '../../../types/Calendar';
import { GoogleCalendar } from '../../apis';

import { mapEvent } from './mapper';

export default defineFunction({
  key: 'dxos.org/function/inbox/google-calendar-sync',
  name: 'Sync Google Calendar',
  description:
    'Sync events from Google Calendar. The initial sync uses startTime ordering for specified number of days. Subsequent syncs use updatedMin to catch all changes.',
  inputSchema: Schema.Struct({
    calendarId: ArtifactId,
    googleCalendarId: Schema.optional(Schema.String),
    syncBackDays: Schema.optional(Schema.Number),
    syncForwardDays: Schema.optional(Schema.Number),
    pageSize: Schema.optional(Schema.Number),
  }),
  outputSchema: Schema.Struct({
    newEvents: Schema.Number,
  }),
  handler: ({
    // TODO(wittjosiah): Schema-based defaults are not yet supported.
    data: { calendarId, googleCalendarId = 'primary', syncBackDays = 30, syncForwardDays = 365, pageSize = 100 },
  }) =>
    Effect.gen(function* () {
      log('syncing google calendar', {
        calendarId,
        googleCalendarId,
        syncBackDays,
        syncForwardDays,
        pageSize,
      });

      const calendar = yield* Database.Service.resolve(DXN.parse(calendarId), Calendar.Calendar);
      const queue = yield* QueueService.getQueue<Event.Event>(calendar.queue.dxn);

      // State management for sync process.
      const newEvents = yield* Ref.make<Event.Event[]>([]);
      const nextPage = yield* Ref.make<string | undefined>(undefined);
      const latestUpdate = yield* Ref.make<string | undefined>(undefined);

      // Determine sync strategy and execute.
      const isInitialSync = !calendar.lastSyncedUpdate;
      if (isInitialSync) {
        yield* performInitialSync({
          googleCalendarId,
          syncBackDays,
          syncForwardDays,
          pageSize,
          newEvents,
          nextPage,
          latestUpdate,
        });
      } else {
        yield* performIncrementalSync({
          googleCalendarId,
          updatedMin: calendar.lastSyncedUpdate!,
          pageSize,
          newEvents,
          nextPage,
          latestUpdate,
        });
      }

      // Update the calendar's last synced update timestamp.
      const lastUpdate = yield* Ref.get(latestUpdate);
      if (lastUpdate) {
        calendar.lastSyncedUpdate = lastUpdate;
        log('updated lastSyncedUpdate', { lastUpdate });
      }

      // Append to queue.
      const queueEvents = yield* Ref.get(newEvents);
      if (queueEvents.length > 0) {
        yield* Function.pipe(
          queueEvents,
          Stream.fromIterable,
          Stream.grouped(10),
          Stream.flatMap((batch) => Effect.tryPromise(() => queue.append(Chunk.toArray(batch)))),
          Stream.runDrain,
        );
      }

      log('sync complete', { newEvents: queueEvents.length, isInitialSync });
      return {
        newEvents: queueEvents.length,
      };
    }).pipe(Effect.provide(FetchHttpClient.layer)),
});

type BaseSyncProps<T = unknown> = {
  googleCalendarId: string;
  pageSize: number;
  newEvents: Ref.Ref<Event.Event[]>;
  nextPage: Ref.Ref<string | undefined>;
  latestUpdate: Ref.Ref<string | undefined>;
} & T;

/**
 * Performs initial sync by fetching all future events in chronological order.
 * Uses singleEvents=true with startTime ordering to get expanded recurring event instances.
 * Recurring events are deduplicated by recurringEventId to keep only one instance per recurring series.
 */
const performInitialSync = Effect.fn(function* ({
  googleCalendarId,
  pageSize,
  newEvents,
  nextPage,
  latestUpdate,
  syncBackDays,
  syncForwardDays,
}: BaseSyncProps<{
  syncBackDays: number;
  syncForwardDays: number;
}>) {
  log('performing initial sync', { syncBackDays, syncForwardDays });
  const now = new Date();
  const timeMin = addDays(now, -syncBackDays).toISOString();
  const timeMax = addDays(now, syncForwardDays).toISOString();

  // Track recurring events we've already seen to avoid duplicates.
  const seenRecurringEventIds = yield* Ref.make<Set<string>>(new Set());

  do {
    const pageToken = yield* Ref.get(nextPage);
    log('requesting events by start time', { timeMin, timeMax, pageToken });
    const { items = [], nextPageToken } = yield* GoogleCalendar.listEventsByStartTime(
      googleCalendarId,
      timeMin,
      timeMax,
      pageSize,
      pageToken,
    );
    yield* Ref.update(nextPage, () => nextPageToken);

    yield* processEvents({ items, newEvents, latestUpdate, seenRecurringEventIds });
  } while (yield* Ref.get(nextPage));
});

/**
 * Performs incremental sync by fetching events updated since last sync.
 */
const performIncrementalSync = Effect.fn(function* ({
  googleCalendarId,
  pageSize,
  newEvents,
  nextPage,
  latestUpdate,
  updatedMin,
}: BaseSyncProps<{
  updatedMin: string;
}>) {
  log('performing incremental sync', { updatedMin });

  do {
    const pageToken = yield* Ref.get(nextPage);
    log('requesting events by updated time', { updatedMin, pageToken });
    const { items = [], nextPageToken } = yield* GoogleCalendar.listEventsByUpdated(
      googleCalendarId,
      updatedMin,
      pageSize,
      pageToken,
    );
    yield* Ref.update(nextPage, () => nextPageToken);

    yield* processEvents({ items, newEvents, latestUpdate });
  } while (yield* Ref.get(nextPage));
});

/**
 * Processes a batch of calendar events:
 *  - tracks timestamps
 *  - deduplicates recurring events
 *  - transforms to DXOS objects
 */
const processEvents = Effect.fn(function* ({
  items,
  newEvents,
  latestUpdate,
  seenRecurringEventIds,
}: {
  items: readonly GoogleCalendar.Event[];
  newEvents: Ref.Ref<Event.Event[]>;
  latestUpdate: Ref.Ref<string | undefined>;
  seenRecurringEventIds?: Ref.Ref<Set<string>>;
}) {
  // Track the latest update timestamp we've seen.
  if (items.length > 0) {
    const maxUpdated = items.reduce((max, event) => {
      if (event.updated && (!max || event.updated > max)) {
        return event.updated;
      }

      return max;
    }, '');
    if (maxUpdated) {
      yield* Ref.update(latestUpdate, (current) => (!current || maxUpdated > current ? maxUpdated : current));
    }
  }

  // Filter events to deduplicate recurring event instances.
  let filteredItems = items;
  if (seenRecurringEventIds) {
    const seen = yield* Ref.get(seenRecurringEventIds);
    filteredItems = items.filter((event) => {
      // Keep non-recurring events.
      if (!event.recurringEventId) {
        return true;
      }
      // For recurring events, only keep the first instance we encounter.
      if (seen.has(event.recurringEventId)) {
        return false;
      }
      seen.add(event.recurringEventId);
      return true;
    });
    yield* Ref.set(seenRecurringEventIds, seen);

    if (filteredItems.length < items.length) {
      log('deduplicated recurring events', {
        total: items.length,
        kept: filteredItems.length,
        duplicates: items.length - filteredItems.length,
      });
    }
  }

  // Transform events to DXOS objects.
  // TODO(wittjosiah): Handle event updates vs new events.
  //  - Set foreignId (event.id) in object meta to track Google Calendar event ID.
  //  - Check if event already exists in queue using foreignId.
  //  - For existing events: update the existing queue entry rather than appending a new one.
  //  - For new events: append to queue as we do now.
  const eventObjects = yield* Function.pipe(
    filteredItems,
    Array.map((event) => mapEvent(event)),
    Effect.all,
    Effect.map((objects) => Array.filter(objects, Predicate.isNotNullable)),
  );

  yield* Ref.update(newEvents, (events) => [...events, ...eventObjects]);
});
