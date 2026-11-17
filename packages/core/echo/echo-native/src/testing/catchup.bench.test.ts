//
// Copyright 2026 DXOS.org
//

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { Filter, Obj } from '@dxos/echo';
import { type SqliteDatabase } from '@dxos/echo-sqlite';
import { TestBuilder } from '@dxos/echo-sqlite/testing';
import { TestSchema } from '@dxos/echo/testing';

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
    // On a real file only when asked (`CATCHUP_FILE=1`): Node's experimental WASI segfaults after a
    // few instances with open files.
    await using nativeDisk = process.env.CATCHUP_FILE
      ? new NativeTestBuilder({ directory: mkdtempSync(join(tmpdir(), 'echo-native-catchup-')) })
      : undefined;
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

    const results: Record<string, number[]> = {
      'echo-sqlite (file)': [],
      'echo-native (memory)': [],
      'echo-native (file)': [],
    };
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
        results['echo-sqlite (file)'].push(performance.now() - start);
        await sync.close();
      }
      for (const [engine, builder] of [
        ['echo-native (memory)', native],
        ...(nativeDisk ? [['echo-native (file)', nativeDisk] as const] : []),
      ] as const) {
        const peer = builder.createPeer({ types: TYPES });
        const db = await peer.openDatabase(source.spaceId);
        const before = db.native.statements(db.store.handle);
        const start = performance.now();
        const sync = peer.sync(db, authority);
        await waitForCount(db, OBJECTS);
        await sync.synced();
        results[engine].push(performance.now() - start);
        statements.push(db.native.statements(db.store.handle) - before);
        const { engineMs, waitMs, applyMs, pulled } = sync.stats;
        console.log(`${engine} engine phases (µs):`, JSON.stringify(db.native.profile(db.store.handle)));
        phases.push(
          `${engine}: pulled ${pulled} blocks; engine ${Math.round(engineMs)} ms, waiting on the authority ${Math.round(waitMs)} ms, live-object refresh ${Math.round(applyMs)} ms`,
        );
        await sync.close();
      }
    }
    const rows = Object.entries(results)
      .filter(([, times]) => times.length > 0)
      .map(([engine, times]) => ({
        engine,
        'median ms': Math.round(median(times)),
        'runs ms': times.map(Math.round).join(', '),
      }));
    console.table(rows);
    console.log(`echo-native SQL statements per catch-up: ${statements.join(', ')}`);
    phases.forEach((line) => console.log(line));
    expect(results['echo-native (memory)']).toHaveLength(RUNS);
  });
});
