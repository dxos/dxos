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
import * as Ref from 'effect/Ref';
import * as Stream from 'effect/Stream';

import { Database, Feed, Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { log } from '@dxos/log';
import { type Event } from '@dxos/types';

import { GoogleCalendar } from '../../apis';
import * as InboxResolver from '../../inbox-resolver';
import { GoogleCredentials } from '../../services/google-credentials';

import { mapEvent } from './mapper';
import { CalendarSync } from '../../definitions';

type BaseSyncProps<T = unknown> = {
  googleCalendarId: string;
  pageSize: number;
  newEvents: Ref.Ref<Event.Event[]>;
  nextPage: Ref.Ref<string | undefined>;
  latestUpdate: Ref.Ref<string | undefined>;
} & T;

export default CalendarSync.pipe(
  Operation.withHandler(
    ({
      calendar: calendarRef,
      googleCalendarId = 'primary',
      syncBackDays = 30,
      syncForwardDays = 365,
      pageSize = 100,
    }) =>
      Effect.gen(function* () {
        log('syncing google calendar', {
          calendar: calendarRef.dxn.toString(),
          googleCalendarId,
          syncBackDays,
          syncForwardDays,
          pageSize,
        });

        const calendar = yield* Database.load(calendarRef);
        const feed = yield* Database.load(calendar.feed);

        const newEvents = yield* Ref.make<Event.Event[]>([]);
        const nextPage = yield* Ref.make<string | undefined>(undefined);
        const latestUpdate = yield* Ref.make<string | undefined>(undefined);

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

        const lastUpdate = yield* Ref.get(latestUpdate);
        if (lastUpdate) {
          Obj.change(calendar, (calendar) => {
            calendar.lastSyncedUpdate = lastUpdate;
          });
          log('updated lastSyncedUpdate', { lastUpdate });
        }

        const queueEvents = yield* Ref.get(newEvents);
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
        return {
          newEvents: queueEvents.length,
        };
      }).pipe(
        Effect.provide(
          Layer.mergeAll(FetchHttpClient.layer, InboxResolver.Live, GoogleCredentials.fromCalendar(calendarRef)),
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

  let filteredItems = items;
  if (seenRecurringEventIds) {
    const seen = yield* Ref.get(seenRecurringEventIds);
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
    yield* Ref.set(seenRecurringEventIds, seen);

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

  yield* Ref.update(newEvents, (events) => [...events, ...eventObjects]);
});
