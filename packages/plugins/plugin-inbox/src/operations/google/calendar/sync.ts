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

import { Operation } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Query, Ref as EchoRef } from '@dxos/echo';
import { log } from '@dxos/log';
import { Integration } from '@dxos/plugin-integration/types';
import { type Event } from '@dxos/types';

import { GoogleCalendar } from '../../../apis';
import { GOOGLE_INTEGRATION_SOURCE } from '../../../constants';
import { CalendarForeignKeyWrongTypeError } from '../../../errors';
import { InboxResolver, GoogleCredentials } from '../../../services';
import { Calendar } from '../../../types';
import { GoogleCalendarSync } from '../../definitions';
import { mapEvent } from './mapper';

type BaseSyncProps<T = unknown> = {
  googleCalendarId: string;
  pageSize: number;
  searchFilter?: string;
  newEvents: Ref.Ref<Event.Event[]>;
  nextPage: Ref.Ref<string | undefined>;
  latestUpdate: Ref.Ref<string | undefined>;
} & T;

const findIntegrationTargetIdx = (integration: Integration.Integration, calendar: Calendar.Calendar): number =>
  integration.targets?.findIndex((target) => {
    if (target.object?.dxn?.asEchoDXN()?.echoId === calendar.id) {
      return true;
    }
    const fkId = Obj.getMeta(calendar).keys?.find((k) => k.source === GOOGLE_INTEGRATION_SOURCE)?.id;
    return fkId !== undefined && target.remoteId === fkId;
  }) ?? -1;

const persistCalendarCursor = (
  integration: Integration.Integration,
  calendar: Calendar.Calendar,
  lastUpdate: string,
) => {
  const idx = findIntegrationTargetIdx(integration, calendar);
  if (idx < 0) {
    return;
  }
  Obj.change(integration, (integration) => {
    const mutable = integration as Obj.Mutable<typeof integration>;
    mutable.targets[idx] = { ...mutable.targets[idx], cursor: lastUpdate };
  });
};

/** Pre-integration `Calendar.lastSyncedUpdate` persisted on legacy objects — migrate onto `targets[].cursor`. */
const readLegacyLastSyncedUpdate = (calendar: Calendar.Calendar): string | undefined => {
  const legacy = calendar as Calendar.Calendar & { lastSyncedUpdate?: unknown };
  return typeof legacy.lastSyncedUpdate === 'string' ? legacy.lastSyncedUpdate : undefined;
};

const clearLegacyLastSyncedUpdate = (calendar: Calendar.Calendar) => {
  if (readLegacyLastSyncedUpdate(calendar) === undefined) {
    return;
  }
  Obj.change(calendar, (calendar) => {
    delete (calendar as { lastSyncedUpdate?: string }).lastSyncedUpdate;
  });
};

/**
 * Find-or-create the local Calendar materialized for this remote calendar
 * id. Idempotent within a space — keyed by `Obj.Meta.keys` matching
 * `{ source: 'google.com', id }`. Used to lazily materialize Calendar
 * targets that the dialog recorded as `{ remoteId, name }` only.
 */
const findOrCreateCalendar = (remoteId: string, name: string) =>
  Effect.gen(function* () {
    const existing = yield* Database.runQuery(
      Query.select(Filter.foreignKeys(Calendar.Calendar, [{ source: GOOGLE_INTEGRATION_SOURCE, id: remoteId }])),
    );
    if (existing.length > 0) {
      const candidate = existing[0];
      // TODO(wittjosiah): Filter.foreignKeys typing may not narrow to Calendar; drop guard if it does.
      if (!Calendar.instanceOf(candidate)) {
        return yield* Effect.fail(new CalendarForeignKeyWrongTypeError());
      }
      return candidate;
    }
    const calendar = Calendar.make({
      [Obj.Meta]: { keys: [{ source: GOOGLE_INTEGRATION_SOURCE, id: remoteId }] },
      name,
    });
    return yield* Database.add(calendar);
  });

const syncOneCalendar = (
  integration: Integration.Integration,
  calendar: Calendar.Calendar,
  defaults: { syncBackDays: number; syncForwardDays: number; pageSize: number; googleCalendarId: string },
) =>
  Effect.gen(function* () {
    const feed = yield* Database.load(calendar.feed);
    const fk = Obj.getMeta(calendar).keys?.find((k) => k.source === GOOGLE_INTEGRATION_SOURCE);
    const googleCalendarId = fk?.id ?? defaults.googleCalendarId;
    const targetIdx = findIntegrationTargetIdx(integration, calendar);
    const rawOpts = targetIdx >= 0 ? integration.targets[targetIdx]?.options : undefined;
    const optRecord = rawOpts && typeof rawOpts === 'object' ? (rawOpts as Record<string, unknown>) : {};
    const syncBackDays = typeof optRecord.syncBackDays === 'number' ? optRecord.syncBackDays : defaults.syncBackDays;
    const syncForwardDays =
      typeof optRecord.syncForwardDays === 'number' ? optRecord.syncForwardDays : defaults.syncForwardDays;
    const searchFilter = typeof optRecord.filter === 'string' ? optRecord.filter : undefined;

    const legacyLastSynced = readLegacyLastSyncedUpdate(calendar);

    let storedCursor =
      targetIdx >= 0 && typeof integration.targets[targetIdx]?.cursor === 'string'
        ? integration.targets[targetIdx]?.cursor
        : undefined;

    if (legacyLastSynced && targetIdx >= 0 && !storedCursor) {
      persistCalendarCursor(integration, calendar, legacyLastSynced);
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
      persistCalendarCursor(integration, calendar, lastUpdate);
      log('updated integration target cursor for calendar', { lastUpdate, calendarId: calendar.id });
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
        const defaults = { googleCalendarId, syncBackDays, syncForwardDays, pageSize };
        const integrationObj = yield* Database.load(integrationRef);
        const calendars: Calendar.Calendar[] = [];
        if (calendarRef) {
          log('syncing google calendar', { calendar: calendarRef.dxn.toString(), ...defaults });
          calendars.push(yield* Database.load(calendarRef));
        } else {
          log('syncing all calendar targets on integration', { integration: integrationRef.dxn.toString() });
          for (const target of integrationObj.targets ?? []) {
            const cal = target.object?.target;
            if (Calendar.instanceOf(cal)) {
              calendars.push(cal);
              continue;
            }
            if (target.remoteId) {
              const created = yield* findOrCreateCalendar(target.remoteId, target.name ?? 'Calendar');
              const remoteId = target.remoteId;
              Obj.change(integrationObj, (integrationObj) => {
                const mutable = integrationObj as Obj.Mutable<typeof integrationObj>;
                const idx = mutable.targets.findIndex((t) => t.remoteId === remoteId);
                if (idx >= 0) {
                  mutable.targets[idx] = { ...mutable.targets[idx], object: EchoRef.make(created) };
                }
              });
              calendars.push(created);
            }
          }
        }

        let total = 0;
        for (const calendar of calendars) {
          total += yield* syncOneCalendar(integrationObj, calendar, defaults);
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
