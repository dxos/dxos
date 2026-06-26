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

// eslint-disable-next-line unused-imports/no-unused-imports
import type { Credential } from '@dxos/compute';
import { Operation } from '@dxos/compute';
import { Database, Feed, Obj, Ref as EchoRef, Relation } from '@dxos/echo';
import { log } from '@dxos/log';
// Connection is referenced in the inferred type of this module's default export via
// InboxOperation.GoogleCalendarSync's schema; the import lets TypeScript name it in .d.ts.
// eslint-disable-next-line unused-imports/no-unused-imports
import { type Connection, SyncBinding } from '@dxos/plugin-connector';
import { type Event } from '@dxos/types';

import { GoogleCalendar } from '../../../apis';
import { GOOGLE_INTEGRATION_SOURCE } from '../../../constants';
import { InboxResolver, GoogleCredentials } from '../../../services';
import { InboxOperation } from '../../../types';
import { Calendar } from '../../../types';
import { mapEvent } from './mapper';

type BaseSyncProps<T = unknown> = {
  googleCalendarId: string;
  pageSize: number;
  searchFilter?: string;
  newEvents: Ref.Ref<Event.Event[]>;
  nextPage: Ref.Ref<string | undefined>;
  latestUpdate: Ref.Ref<string | undefined>;
} & T;

const persistCalendarCursor = (binding: SyncBinding.SyncBinding, lastUpdate: string) => {
  Relation.update(binding, (binding) => {
    binding.cursor = lastUpdate;
  });
};

/** Pre-integration `Calendar.lastSyncedUpdate` persisted on legacy objects — migrate onto `binding.cursor`. */
const readLegacyLastSyncedUpdate = (calendar: Calendar.Calendar): string | undefined => {
  const legacy = calendar as Calendar.Calendar & { lastSyncedUpdate?: unknown };
  return typeof legacy.lastSyncedUpdate === 'string' ? legacy.lastSyncedUpdate : undefined;
};

const clearLegacyLastSyncedUpdate = (calendar: Calendar.Calendar) => {
  if (readLegacyLastSyncedUpdate(calendar) === undefined) {
    return;
  }
  Obj.update(calendar, (calendar) => {
    delete (calendar as { lastSyncedUpdate?: string }).lastSyncedUpdate;
  });
};

const syncOneCalendar = (
  binding: SyncBinding.SyncBinding,
  calendar: Calendar.Calendar,
  defaults: { syncBackDays: number; syncForwardDays: number; pageSize: number; googleCalendarId: string },
) =>
  Effect.gen(function* () {
    const feed = yield* Database.load(calendar.feed);
    const fk = Obj.getMeta(calendar).keys?.find((k) => k.source === GOOGLE_INTEGRATION_SOURCE);
    const googleCalendarId = fk?.id ?? binding.remoteId ?? defaults.googleCalendarId;
    const optRecord = binding.options ?? {};
    const syncBackDays = typeof optRecord.syncBackDays === 'number' ? optRecord.syncBackDays : defaults.syncBackDays;
    const syncForwardDays =
      typeof optRecord.syncForwardDays === 'number' ? optRecord.syncForwardDays : defaults.syncForwardDays;
    const searchFilter = typeof optRecord.filter === 'string' ? optRecord.filter : undefined;

    const legacyLastSynced = readLegacyLastSyncedUpdate(calendar);

    let storedCursor = typeof binding.cursor === 'string' ? binding.cursor : undefined;

    if (legacyLastSynced && !storedCursor) {
      persistCalendarCursor(binding, legacyLastSynced);
      clearLegacyLastSyncedUpdate(calendar);
      storedCursor = legacyLastSynced;
    }

    storedCursor ??= legacyLastSynced;
    const isInitialSync = !storedCursor;

    const newEvents = yield* Ref.make<Event.Event[]>([]);
    const nextPage = yield* Ref.make<string | undefined>(undefined);
    const latestUpdate = yield* Ref.make<string | undefined>(undefined);

    if (isInitialSync) {
      yield* performInitialSync({
        googleCalendarId,
        syncBackDays,
        syncForwardDays,
        pageSize: defaults.pageSize,
        searchFilter,
        newEvents,
        nextPage,
        latestUpdate,
      });
    } else {
      yield* performIncrementalSync({
        googleCalendarId,
        updatedMin: storedCursor!,
        pageSize: defaults.pageSize,
        searchFilter,
        newEvents,
        nextPage,
        latestUpdate,
      });
    }

    const lastUpdate = yield* Ref.get(latestUpdate);
    if (lastUpdate) {
      persistCalendarCursor(binding, lastUpdate);
      log('updated binding cursor for calendar', { lastUpdate, calendarId: calendar.id });
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
    return queueEvents.length;
  });

export default InboxOperation.GoogleCalendarSync.pipe(
  Operation.withHandler(
    ({ binding: bindingRef, googleCalendarId = 'primary', syncBackDays = 30, syncForwardDays = 365, pageSize = 100 }) =>
      Effect.gen(function* () {
        const bindingObj = bindingRef.target;
        const db = bindingObj ? Obj.getDatabase(bindingObj) : undefined;
        if (!bindingObj || !db) {
          return { newEvents: 0 };
        }

        const connectionRef = EchoRef.make(Relation.getSource(bindingObj));
        const defaults = { googleCalendarId, syncBackDays, syncForwardDays, pageSize };

        return yield* Effect.gen(function* () {
          const binding = yield* Database.load(bindingRef);
          const calendar = Relation.getTarget(binding);
          if (!Calendar.instanceOf(calendar)) {
            // The integration mechanism only ever binds Calendars for Google Calendar.
            return { newEvents: 0 };
          }
          log('syncing google calendar', { calendar: Obj.getURI(calendar), ...defaults });

          const total = yield* syncOneCalendar(binding, calendar, defaults);

          Relation.update(binding, (binding) => {
            binding.lastSyncAt = new Date().toISOString();
            binding.lastError = undefined;
          });

          return { newEvents: total };
        }).pipe(
          Effect.provide(
            Layer.mergeAll(FetchHttpClient.layer, InboxResolver.Live, GoogleCredentials.fromConnection(connectionRef)),
          ),
        );
      }),
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
  searchFilter,
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
      searchFilter,
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
  searchFilter,
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
      searchFilter,
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
