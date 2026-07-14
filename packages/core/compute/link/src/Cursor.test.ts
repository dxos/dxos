//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Feed, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Expando } from '@dxos/schema';

import * as Cursor from './Cursor';

describe('Cursor.layer', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('runs the machinery off a feed cursor with no external/credential coupling', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Cursor.Cursor, Feed.Feed, Expando.Expando] });
    const feed = db.add(Feed.make());
    const target = db.add(Expando.make({ name: 'facts' }));
    const cursor = db.add(Cursor.makeFeed({ source: Ref.make(feed), target: Ref.make(target), value: 'seed' }));

    const state = await Effect.gen(function* () {
      return yield* Cursor.Service;
    }).pipe(
      Effect.provide(
        Cursor.layer({
          cursor,
          foreignKeySource: 'test',
          cursorKey: 0,
          stats: { newMessages: 0 },
        }),
      ),
      Effect.provide(Database.layer(db)),
      EffectEx.runAndForwardErrors,
    );

    expect(state.cursor.id).toBe(cursor.id);
    expect(state.cursor.value).toBe('seed');
    expect(Cursor.isFeed(cursor)).toBe(true);
  });
});

/** Calendar-day arithmetic mirroring {@link Cursor.resolveWindow}'s internal helper. */
const addCalendarDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

describe('resolveWindow', () => {
  const NOW = new Date('2026-07-06T00:00:00.000Z');

  test('no cursor → backward initial from the default horizon to today', ({ expect }) => {
    const window = Cursor.resolveWindow({ cursorKey: 0, now: NOW });
    expect(window.direction).toBe('backward');
    expect(window.start).toEqual(addCalendarDays(NOW, -30));
    expect(window.end).toEqual(addCalendarDays(NOW, 1));
  });

  test('cursor → forward incremental from the cursor', ({ expect }) => {
    const cursorKey = new Date('2026-06-01T00:00:00.000Z').getTime();
    const window = Cursor.resolveWindow({ cursorKey, now: NOW });
    expect(window.direction).toBe('forward');
    expect(window.start).toEqual(new Date(cursorKey));
    expect(window.end).toEqual(addCalendarDays(NOW, 1));
  });

  test('direction: backward + before → backfill older gaps, ignoring the cursor as the start', ({ expect }) => {
    const cursorKey = new Date('2026-06-01T00:00:00.000Z').getTime();
    const before = new Date('2026-05-01T00:00:00.000Z').getTime();
    const window = Cursor.resolveWindow({ cursorKey, now: NOW, direction: 'backward', before });
    expect(window.direction).toBe('backward');
    // Backward never resumes from the cursor; it walks from the horizon up to `before`.
    expect(window.start).toEqual(addCalendarDays(NOW, -30));
    expect(window.end).toEqual(new Date(before));
  });

  test('syncBackDays overrides the horizon', ({ expect }) => {
    const window = Cursor.resolveWindow({ cursorKey: 0, now: NOW, syncBackDays: 7 });
    expect(window.start).toEqual(addCalendarDays(NOW, -7));
  });

  test('backward + before + syncBackDays anchors the horizon to before, not now', ({ expect }) => {
    const cursorKey = new Date('2026-06-01T00:00:00.000Z').getTime();
    const before = new Date('2020-01-01T00:00:00.000Z').getTime();
    const window = Cursor.resolveWindow({
      cursorKey,
      now: NOW,
      direction: 'backward',
      before,
      syncBackDays: 7,
    });
    expect(window.start).toEqual(addCalendarDays(new Date(before), -7));
    expect(window.end).toEqual(new Date(before));
    expect(window.start.getTime()).toBeLessThan(window.end.getTime());
  });

  test('after sets the horizon when syncBackDays is absent', ({ expect }) => {
    const after = '2026-01-01T00:00:00.000Z';
    const window = Cursor.resolveWindow({ cursorKey: 0, now: NOW, after });
    expect(window.start).toEqual(new Date(after));
  });
});
