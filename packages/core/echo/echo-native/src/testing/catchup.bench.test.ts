//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Filter, Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import { type SqliteDatabase } from '../../../echo-sqlite/src/database.ts';
import { TestBuilder } from '../../../echo-sqlite/src/testing/harness.ts';
import { type NativeDatabase } from '../database.ts';
import { NativeTestBuilder } from './harness.ts';

const OBJECTS = Number(process.env.CATCHUP_OBJECTS ?? 1_000);
const RUNS = Number(process.env.CATCHUP_RUNS ?? 3);
const TYPES = [TestSchema.Expando];

const median = (values: number[]): number =>
  [...values].sort((left, right) => left - right)[Math.floor(values.length / 2)];

/** Waits until a query sees `count` objects, flushing and yielding between checks. */
const waitForCount = async (db: SqliteDatabase | NativeDatabase, count: number): Promise<void> => {
  for (let attempt = 0; attempt < 10_000; attempt++) {
    const objects = await db.query(Filter.type(TestSchema.Expando)).run();
    if (objects.length >= count) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  throw new Error('catch-up did not finish');
};

/**
 * Sync catch-up: one authority holds `OBJECTS` objects, written by an echo-sqlite peer; fresh peers of
 * each engine pull them all until a query sees every one. Prints a table; asserts only completion.
 */
describe('sync catch-up', { tags: ['manual'], timeout: 600_000 }, () => {
  test(`a new peer pulls ${OBJECTS} objects`, async () => {
    await using sqlite = new TestBuilder();
    await using native = new NativeTestBuilder();
    const authority = sqlite.createAuthority();

    const writer = sqlite.createPeer({ types: TYPES });
    const source = await writer.createDatabase();
    const writerSync = writer.sync(source, authority);
    for (let index = 0; index < OBJECTS; index++) {
      source.add(Obj.make(TestSchema.Expando, { value: index, label: `label-${index}` }));
      if (index % 100 === 99) {
        await source.flush();
      }
    }
    await source.flush();
    await writerSync.synced();
    await writerSync.close();

    const results: Record<string, number[]> = { 'echo-sqlite': [], 'echo-native': [] };
    const statements: number[] = [];
    const phases: string[] = [];
    for (let run = 0; run < RUNS; run++) {
      {
        const peer = sqlite.createPeer({ types: TYPES });
        const db = await peer.openDatabase(source.spaceId);
        const start = performance.now();
        const sync = peer.sync(db, authority);
        await waitForCount(db, OBJECTS);
        await sync.synced();
        results['echo-sqlite'].push(performance.now() - start);
        await sync.close();
      }
      {
        const peer = native.createPeer({ types: TYPES });
        const db = await peer.openDatabase(source.spaceId);
        const before = db.native.statements(db.store.handle);
        const start = performance.now();
        const sync = peer.sync(db, authority);
        await waitForCount(db, OBJECTS);
        await sync.synced();
        results['echo-native'].push(performance.now() - start);
        statements.push(db.native.statements(db.store.handle) - before);
        const { engineMs, waitMs, applyMs, pulled } = sync.stats;
        console.log('echo-native engine phases (µs):', JSON.stringify(db.native.profile(db.store.handle)));
        phases.push(
          `pulled ${pulled} blocks; engine ${Math.round(engineMs)} ms, waiting on the authority ${Math.round(waitMs)} ms, live-object refresh ${Math.round(applyMs)} ms`,
        );
        await sync.close();
      }
    }
    const rows = Object.entries(results).map(([engine, times]) => ({
      engine,
      'median ms': Math.round(median(times)),
      'runs ms': times.map(Math.round).join(', '),
    }));
    console.table(rows);
    console.log(`echo-native SQL statements per catch-up: ${statements.join(', ')}`);
    phases.forEach((line) => console.log(`echo-native ${line}`));
    expect(results['echo-native']).toHaveLength(RUNS);
  });
});
