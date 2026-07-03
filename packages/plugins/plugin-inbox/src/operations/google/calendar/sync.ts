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

// eslint-disable-next-line unused-imports/no-unused-imports
import type { Credential } from '@dxos/compute';
import { Operation } from '@dxos/compute';
import { Database, Ref as EchoRef, Obj, Relation } from '@dxos/echo';
import { type Resolver } from '@dxos/extractor';
import * as InboxResolver from '@dxos/extractor-lib';
import { log } from '@dxos/log';
import { Pipeline, Stage } from '@dxos/pipeline';
// Connection is referenced in the inferred type of this module's default export via
// InboxOperation.GoogleCalendarSync's schema; the import lets TypeScript name it in .d.ts.
// eslint-disable-next-line unused-imports/no-unused-imports
import { type Connection, SyncBinding } from '@dxos/plugin-connector';

import { mapEvent } from './mapper';
import { GoogleCalendar } from '../../../apis';
import { GOOGLE_INTEGRATION_SOURCE } from '../../../constants';
import { GoogleCredentials } from '../../../services';
import { makeDedupStage } from '../../../sync';
import { Calendar, InboxOperation } from '../../../types';

const COMMIT_PAGE_SIZE = 10;

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

    // The cursor is the event `updated` high-water mark (stored ISO, compared as epoch-ms). A missing
    // cursor means initial sync (window by start time); otherwise incremental (by `updatedMin`).
    const legacyLastSynced = readLegacyLastSyncedUpdate(calendar);
    let storedCursor = typeof binding.cursor === 'string' ? binding.cursor : undefined;
    if (legacyLastSynced && !storedCursor) {
      persistCalendarCursor(binding, legacyLastSynced);
      clearLegacyLastSyncedUpdate(calendar);
      storedCursor = legacyLastSynced;
    }
    storedCursor ??= legacyLastSynced;
    const cursorKey = storedCursor ? Date.parse(storedCursor) : 0;
    const isInitialSync = cursorKey === 0;
    log('syncing google calendar events', { googleCalendarId, isInitialSync });

    const stats: SyncBinding.Stats = { newMessages: 0 };

    yield* calendarSource(googleCalendarId, cursorKey, {
      syncBackDays,
      syncForwardDays,
      pageSize: defaults.pageSize,
      searchFilter,
    }).pipe(
      makeDedupStage<GoogleCalendar.Event>(
        'dedup',
        (event) => event.id,
        (event) => (event.updated ? Date.parse(event.updated) : 0),
      ),
      makeRecurringDedupStage(isInitialSync),
      mapEventStage,
      Stream.grouped(COMMIT_PAGE_SIZE),
      Pipeline.run({ sink: SyncBinding.commit }),
      Effect.provide(
        SyncBinding.layer({
          feed,
          foreignKeySource: GOOGLE_INTEGRATION_SOURCE,
          cursorKey,
          // Store the cursor as an ISO `updated` timestamp (used as `updatedMin` next run).
          persistCursorKey: (key) => persistCalendarCursor(binding, new Date(key).toISOString()),
          stats,
        }),
      ),
    );

    log('sync complete', { newEvents: stats.newMessages, isInitialSync });
    return stats.newMessages;
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
  Operation.opaqueHandler,
);

/** Maps a Google event to a commit unit (event → feed). Resolves attendees via `Resolver`; drops
 * cancelled/start-less events (mapEvent returns null). Events carry no tags or extracted objects. */
const mapEventStage: Stage.Stage<GoogleCalendar.Event, SyncBinding.CommitUnit, never, Resolver> = Stage.map(
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
              extractedObjects: [],
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
