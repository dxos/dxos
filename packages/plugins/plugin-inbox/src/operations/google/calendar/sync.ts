//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import { addDays } from 'date-fns';
import * as Array from 'effect/Array';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Predicate from 'effect/Predicate';
import * as EffectRef from 'effect/Ref';
import * as Stream from 'effect/Stream';

import { Database, Filter, Obj, Query, Ref } from '@dxos/echo';
import { Feed } from '@dxos/echo';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { type Event } from '@dxos/types';

import { GoogleCalendar } from '../../../apis';
import { InboxResolver, GoogleCredentials } from '../../../services';
import { Calendar } from '../../../types';
import { GoogleCalendarSync } from '../../definitions';
import { mapEvent } from './mapper';

const GOOGLE_SOURCE = 'google.com';

type BaseSyncProps<T = unknown> = {
  googleCalendarId: string;
  pageSize: number;
  newEvents: EffectRef.Ref<Event.Event[]>;
  nextPage: EffectRef.Ref<string | undefined>;
  latestUpdate: EffectRef.Ref<string | undefined>;
} & T;

/**
 * Find-or-create the local Calendar materialized for this remote calendar
 * id. Idempotent within a space — keyed by `Obj.Meta.keys` matching
 * `{ source: 'google.com', id }`. Used to lazily materialize Calendar
 * targets that the dialog recorded as `{ remoteId, name }` only.
 */
const findOrCreateCalendar = (remoteId: string, name: string) =>
  Effect.gen(function* () {
    const existing = yield* Database.runQuery(
      Query.select(Filter.foreignKeys(Calendar.Calendar, [{ source: GOOGLE_SOURCE, id: remoteId }])),
    );
    if (existing.length > 0) {
      return existing[0] as Calendar.Calendar;
    }
    const calendar = Calendar.make({
      [Obj.Meta]: { keys: [{ source: GOOGLE_SOURCE, id: remoteId }] },
      name,
    });
    return yield* Database.add(calendar);
  });

/**
 * Sync a single Calendar's events into its feed. Pulled out as a helper
 * so the handler can reuse it for both the single-calendar and
 * sync-all-targets entry points.
 */
const syncOneCalendar = (
  calendar: Calendar.Calendar,
  config: { googleCalendarId: string; syncBackDays: number; syncForwardDays: number; pageSize: number },
) =>
  Effect.gen(function* () {
    const feed = yield* Database.load(calendar.feed);

    const newEvents = yield* EffectRef.make<Event.Event[]>([]);
    const nextPage = yield* EffectRef.make<string | undefined>(undefined);
    const latestUpdate = yield* EffectRef.make<string | undefined>(undefined);

    const isInitialSync = !calendar.lastSyncedUpdate;
    if (isInitialSync) {
      yield* performInitialSync({
        googleCalendarId: config.googleCalendarId,
        syncBackDays: config.syncBackDays,
        syncForwardDays: config.syncForwardDays,
        pageSize: config.pageSize,
        newEvents,
        nextPage,
        latestUpdate,
      });
    } else {
      yield* performIncrementalSync({
        googleCalendarId: config.googleCalendarId,
        updatedMin: calendar.lastSyncedUpdate!,
        pageSize: config.pageSize,
        newEvents,
        nextPage,
        latestUpdate,
      });
    }

    const lastUpdate = yield* EffectRef.get(latestUpdate);
    if (lastUpdate) {
      Obj.change(calendar, (calendar) => {
        calendar.lastSyncedUpdate = lastUpdate;
      });
      log('updated lastSyncedUpdate', { lastUpdate });
    }

    const queueEvents = yield* EffectRef.get(newEvents);
    if (queueEvents.length > 0) {
      yield* Function.pipe(
        queueEvents,
        Stream.fromIterable,
        Stream.grouped(10),
        Stream.mapEffect((batch) => Feed.append(feed, Chunk.toArray(batch))),
        Stream.runDrain,
      );
    }

    log('sync complete', { newEvents: queueEvents.length, isInitialSync });
    return queueEvents.length;
  });

export default GoogleCalendarSync.pipe(
  Operation.withHandler(
    ({
      integration: integrationRef,
      calendar: calendarRef,
      googleCalendarId = 'primary',
      syncBackDays = 30,
      syncForwardDays = 365,
      pageSize = 100,
    }) =>
      Effect.gen(function* () {
        const config = { googleCalendarId, syncBackDays, syncForwardDays, pageSize };

        // Resolve the calendars to sync. Single-calendar entry: just that one.
        // No-calendar entry: every Calendar target on the integration, lazily
        // materializing entries that only have `{ remoteId, name }` recorded.
        const calendars: Calendar.Calendar[] = [];
        if (calendarRef) {
          log('syncing google calendar', { calendar: calendarRef.dxn.toString(), ...config });
          calendars.push(yield* Database.load(calendarRef));
        } else {
          log('syncing all calendar targets on integration', { integration: integrationRef.dxn.toString() });
          const integration = yield* Database.load(integrationRef);
          for (const target of integration.targets ?? []) {
            const cal = target.object?.target;
            if (cal && Obj.instanceOf(Calendar.Calendar, cal)) {
              calendars.push(cal as Calendar.Calendar);
              continue;
            }
            // Recorded in the dialog but not yet materialized: find-or-create
            // the Calendar from `remoteId` + `name` and write the ref back so
            // subsequent syncs hit the already-materialized branch.
            if (target.remoteId) {
              const created = yield* findOrCreateCalendar(target.remoteId, target.name ?? 'Calendar');
              const remoteId = target.remoteId;
              Obj.change(integration, (mutableObj) => {
                const mutable = mutableObj as Obj.Mutable<typeof mutableObj>;
                const idx = mutable.targets.findIndex((t) => t.remoteId === remoteId);
                if (idx >= 0) {
                  mutable.targets[idx] = { ...mutable.targets[idx], object: Ref.make(created) };
                }
              });
              calendars.push(created);
            }
          }
        }

        let total = 0;
        for (const calendar of calendars) {
          total += yield* syncOneCalendar(calendar, config);
        }
        return { newEvents: total };
      }).pipe(
        Effect.provide(
          Layer.mergeAll(FetchHttpClient.layer, InboxResolver.Live, GoogleCredentials.fromIntegration(integrationRef)),
        ),
      ),
  ),
);

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

  const seenRecurringEventIds = yield* EffectRef.make<Set<string>>(new Set());

  do {
    const pageToken = yield* EffectRef.get(nextPage);
    log('requesting events by start time', { timeMin, timeMax, pageToken });
    const { items = [], nextPageToken } = yield* GoogleCalendar.listEventsByStartTime(
      googleCalendarId,
      timeMin,
      timeMax,
      pageSize,
      pageToken,
    );
    yield* EffectRef.update(nextPage, () => nextPageToken);
    yield* processEvents({ items, newEvents, latestUpdate, seenRecurringEventIds });
  } while (yield* EffectRef.get(nextPage));
});

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
    const pageToken = yield* EffectRef.get(nextPage);
    log('requesting events by updated time', { updatedMin, pageToken });
    const { items = [], nextPageToken } = yield* GoogleCalendar.listEventsByUpdated(
      googleCalendarId,
      updatedMin,
      pageSize,
      pageToken,
    );
    yield* EffectRef.update(nextPage, () => nextPageToken);

    yield* processEvents({ items, newEvents, latestUpdate });
  } while (yield* EffectRef.get(nextPage));
});

const processEvents = Effect.fn(function* ({
  items,
  newEvents,
  latestUpdate,
  seenRecurringEventIds,
}: {
  items: readonly GoogleCalendar.Event[];
  newEvents: EffectRef.Ref<Event.Event[]>;
  latestUpdate: EffectRef.Ref<string | undefined>;
  seenRecurringEventIds?: EffectRef.Ref<Set<string>>;
}) {
  if (items.length > 0) {
    const maxUpdated = items.reduce((max, event) => {
      if (event.updated && (!max || event.updated > max)) {
        return event.updated;
      }

      return max;
    }, '');
    if (maxUpdated) {
      yield* EffectRef.update(latestUpdate, (current) => (!current || maxUpdated > current ? maxUpdated : current));
    }
  }

  let filteredItems = items;
  if (seenRecurringEventIds) {
    const seen = yield* EffectRef.get(seenRecurringEventIds);
    filteredItems = items.filter((event) => {
      if (!event.recurringEventId) {
        return true;
      }
      if (seen.has(event.recurringEventId)) {
        return false;
      }
      seen.add(event.recurringEventId);
      return true;
    });
    yield* EffectRef.set(seenRecurringEventIds, seen);

    if (filteredItems.length < items.length) {
      log('deduplicated recurring events', {
        total: items.length,
        kept: filteredItems.length,
        duplicates: items.length - filteredItems.length,
      });
    }
  }

  const eventObjects = yield* Function.pipe(
    filteredItems,
    Array.map((event) => mapEvent(event)),
    Effect.all,
    Effect.map((objects) => Array.filter(objects, Predicate.isNotNullable)),
  );

  yield* EffectRef.update(newEvents, (events) => [...events, ...eventObjects]);
});
