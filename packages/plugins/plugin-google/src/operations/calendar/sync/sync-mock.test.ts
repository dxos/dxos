//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Feed, Filter, Obj, Query, Ref, Scope } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import * as InboxResolver from '@dxos/extractor-lib';
import { AccessToken, Connection, Cursor } from '@dxos/link';
import * as Binding from '@dxos/plugin-connector/Binding';
import * as Calendar from '@dxos/plugin-inbox/Calendar';
import { TagIndex } from '@dxos/schema';
import { Event, Organization, Person } from '@dxos/types';

import { GoogleCalendarApi } from '#services';

import { GOOGLE_CALENDAR_CONNECTOR_ID, GOOGLE_INTEGRATION_SOURCE } from '../../../constants.ts';
import { generateCalendarDataset, generateRecurringSeries } from '../../../testing/calendar-fixtures.ts';
import { type SyncCalendarProps, syncCalendar } from './sync.ts';

/**
 * Google Calendar sync against a mocked API — the offline peer of the Gmail sync suite, driven
 * through the connection-level fan-out the handler wraps. The live-API smoke tests in `sync.test.ts`
 * still need `ACCESS_TOKEN`; these do not, so calendar sync is covered in CI.
 */

const TYPES = [
  Calendar.Calendar,
  Event.Event,
  Person.Person,
  Organization.Organization,
  Feed.Feed,
  TagIndex.TagIndex,
  AccessToken.AccessToken,
  Connection.Connection,
  Cursor.Cursor,
];

const REMOTE_CALENDAR_ID = 'primary';

describe('calendar sync against a mock Google Calendar API', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('an initial sync commits every event in the window and advances the cursor', async ({ expect }) => {
    // The sync windows against the wall clock, so the fixture must be laid out around it too.
    const now = new Date();
    const { db, calendar, connection, binding } = await seedCalendarBinding(builder);
    const dataset = generateCalendarDataset({ count: 4, now });

    const { newEvents } = await EffectEx.runPromise(
      syncConnection(connection).pipe(Effect.provide(services(db, dataset))),
    );

    expect(newEvents).toBe(4);
    expect((await queryFeedEvents(db, calendar)).length).toBe(4);
    // The cursor holds the events' `updated` high-water mark, stored as ISO.
    expect(binding.max).toBeDefined();
  });

  test('a re-run commits nothing new (dedup on event id)', async ({ expect }) => {
    // The sync windows against the wall clock, so the fixture must be laid out around it too.
    const now = new Date();
    const { db, calendar, connection } = await seedCalendarBinding(builder);
    const dataset = generateCalendarDataset({ count: 3, now });

    await EffectEx.runPromise(syncConnection(connection).pipe(Effect.provide(services(db, dataset))));
    const { newEvents } = await EffectEx.runPromise(
      syncConnection(connection).pipe(Effect.provide(services(db, dataset))),
    );

    expect(newEvents).toBe(0);
    expect((await queryFeedEvents(db, calendar)).length).toBe(3);
  });

  test('events outside the sync window are not fetched', async ({ expect }) => {
    // The sync windows against the wall clock, so the fixture must be laid out around it too.
    const now = new Date();
    const { db, calendar, connection } = await seedCalendarBinding(builder);
    // A stride of 400 days pushes all but the first event past the default forward window.
    const dataset = generateCalendarDataset({ count: 3, now, strideDays: 400 });

    const { newEvents } = await EffectEx.runPromise(
      syncConnection(connection, { syncForwardDays: 30, syncBackDays: 30 }).pipe(Effect.provide(services(db, dataset))),
    );

    expect(newEvents).toBe(1);
    expect((await queryFeedEvents(db, calendar)).length).toBe(1);
  });

  test('an expanded recurring series collapses to one event on the initial sync', async ({ expect }) => {
    // The sync windows against the wall clock, so the fixture must be laid out around it too.
    const now = new Date();
    const { db, calendar, connection } = await seedCalendarBinding(builder);
    const dataset = generateRecurringSeries({ count: 3, now });

    const { newEvents } = await EffectEx.runPromise(
      syncConnection(connection, { syncForwardDays: 60 }).pipe(Effect.provide(services(db, dataset))),
    );

    // `makeRecurringDedupStage` is enabled on an initial sync: three instances, one committed event.
    expect(newEvents).toBe(1);
    const events = await queryFeedEvents(db, calendar);
    expect(events.length).toBe(1);
    // The series fixture carries no `organizer`; the event still maps, with an empty owner. Regression:
    // the mapper asserted `owner!` and produced an object that failed schema decode.
    expect(events[0]!.owner).toEqual({});
  });

  test('paging fetches every event across multiple pages', async ({ expect }) => {
    // The sync windows against the wall clock, so the fixture must be laid out around it too.
    const now = new Date();
    const { db, calendar, connection } = await seedCalendarBinding(builder);
    const dataset = generateCalendarDataset({ count: 7, now });

    const { newEvents } = await EffectEx.runPromise(
      syncConnection(connection, { pageSize: 2 }).pipe(Effect.provide(services(db, dataset))),
    );

    expect(newEvents).toBe(7);
    expect((await queryFeedEvents(db, calendar)).length).toBe(7);
  });
});

/** Seeds a Calendar bound to a remote Google calendar, mirroring what `MaterializeCalendarTarget` builds. */
const seedCalendarBinding = async (builder: EchoTestBuilder, { max }: { max?: string } = {}) => {
  const { db } = await builder.createDatabase({ types: TYPES });
  const calendar = db.add(
    Calendar.make({
      [Obj.Meta]: { keys: [{ source: GOOGLE_INTEGRATION_SOURCE, id: REMOTE_CALENDAR_ID }] },
      name: 'Test',
    }),
  );
  const accessToken = db.add(AccessToken.make({ source: GOOGLE_INTEGRATION_SOURCE, token: 'token' }));
  const connection = db.add(
    Connection.make({ connectorId: GOOGLE_CALENDAR_CONNECTOR_ID, accessToken: Ref.make(accessToken) }),
  );
  const binding = db.add(Cursor.makeExternal({ source: connection.accessToken, target: Ref.make(calendar), max }));
  await db.flush({ indexes: true });
  return { db, calendar, connection, binding };
};

/** Mirrors the handler: fan out over the connection's bindings, folding per-binding event counts. */
const syncConnection = (connection: Connection.Connection, props: Omit<SyncCalendarProps, 'binding'> = {}) =>
  Binding.syncAll({
    connection: Ref.make(connection),
    sync: (binding) => syncCalendar({ binding: Ref.make(binding), ...props }),
  }).pipe(
    Effect.map(({ outputs }) => ({
      newEvents: outputs.reduce((total, output) => total + output.newEvents, 0),
    })),
  );

/** Reads the events the sync committed to the calendar's feed (same shape as the Gmail suite's helper). */
const queryFeedEvents = (db: Database.Database, calendar: Calendar.Calendar) =>
  db.query(Query.select(Filter.type(Event.Event)).from(Scope.feed(Feed.getFeedUri(calendar.feed.target!)!))).run();

const services = (db: Database.Database, dataset: Parameters<typeof GoogleCalendarApi.mock>[0]) =>
  Layer.mergeAll(
    GoogleCalendarApi.mock(dataset),
    Database.layer(db),
    InboxResolver.Live.pipe(Layer.provide(Database.layer(db))),
  );
