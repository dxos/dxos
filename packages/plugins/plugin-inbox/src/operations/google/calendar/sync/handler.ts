//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';

import { Operation } from '@dxos/compute';
import { Database, Ref as EchoRef, Obj, Relation } from '@dxos/echo';
import * as InboxResolver from '@dxos/extractor-lib';
import { log } from '@dxos/log';
import { Pipeline } from '@dxos/pipeline';
import { SyncBinding } from '@dxos/plugin-connector';

import { GoogleCalendar } from '../../../../apis';
import { GOOGLE_INTEGRATION_SOURCE } from '../../../../constants';
import { GoogleCredentials } from '../../../../services';
import { Calendar, InboxOperation } from '../../../../types';
import { getEvents, makeRecurringDedupStage, mapEventStage } from './sync';

const COMMIT_PAGE_SIZE = 10;

const DEFAULT_SYNC_BACK_DAYS = 30;
const DEFAULT_SYNC_FORWARD_DAYS = 365;
const DEFAULT_PAGE_SIZE = 100;

const handler: Operation.WithHandler<typeof InboxOperation.GoogleCalendarSync> = InboxOperation.GoogleCalendarSync.pipe(
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

          const feed = yield* Database.load(calendar.feed);
          const fk = Obj.getMeta(calendar).keys?.find((k) => k.source === GOOGLE_INTEGRATION_SOURCE);
          const calendarId = fk?.id ?? binding.remoteId ?? defaults.googleCalendarId;
          const optRecord = binding.options ?? {};
          const syncBack = typeof optRecord.syncBackDays === 'number' ? optRecord.syncBackDays : defaults.syncBackDays;
          const syncForward =
            typeof optRecord.syncForwardDays === 'number' ? optRecord.syncForwardDays : defaults.syncForwardDays;
          const searchFilter = typeof optRecord.filter === 'string' ? optRecord.filter : undefined;

          // The cursor is the event `updated` high-water mark (stored ISO, compared as epoch-ms). A
          // missing cursor means initial sync (window by start time); otherwise incremental
          // (by `updatedMin`).
          const cursor = yield* Database.load(binding.cursor);
          const cursorKey = typeof cursor.value === 'string' ? Date.parse(cursor.value) : 0;
          const isInitialSync = cursorKey === 0;
          log('syncing google calendar', { calendar: Obj.getURI(calendar), calendarId, isInitialSync });

          const stats: SyncBinding.Stats = { newMessages: 0 };
          yield* getEvents(calendarId, cursorKey, {
            syncBackDays: syncBack,
            syncForwardDays: syncForward,
            pageSize: defaults.pageSize,
            searchFilter,
          }).pipe(
            SyncBinding.dedupStage<GoogleCalendar.Event>(
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
                binding,
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
          // `SyncBinding.commit`) so cross-run dedup / resolution observe this run's writes.
          yield* Database.flush({ indexes: true });

          log('calendar sync complete', { newEvents: stats.newMessages, isInitialSync });
          return { newEvents: stats.newMessages };
        }).pipe(
          Effect.provide(
            Layer.mergeAll(
              FetchHttpClient.layer,
              InboxResolver.Live,
              GoogleCredentials.fromConnection(connectionRef),
              Database.layer(db),
            ),
          ),
        );
      }),
  ),
  Operation.opaqueHandler,
);

export default handler;
