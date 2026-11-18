//
// Copyright 2026 DXOS.org
//

import { rmSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import { Filter, Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import { EchoTestBuilder, createTmpPath } from './echo-test-builder.ts';

const NAME = 'echo-sqlite';
const BUILDER = () => new EchoTestBuilder();

const OBJECTS = Number(process.env.COLD_QUERY_OBJECTS ?? 1_000);
const ROUNDS = Number(process.env.COLD_QUERY_ROUNDS ?? 7);

const median = (values: number[]): number =>
  [...values].sort((left, right) => left - right)[Math.floor(values.length / 2)];

/**
 * Cold query: a file holds `OBJECTS` objects; each round reloads the peer, reopens the database and
 * runs one query for every object, reading a field of each so every object is hydrated. Prints the
 * median open and query times; asserts only that every object came back.
 */
describe('cold query', { tags: ['manual'], timeout: 600_000 }, () => {
  test(`query ${OBJECTS} objects after reopening`, async () => {
    const storagePath = createTmpPath();
    await using builder = await BUILDER().open();
    const peer = await builder.createPeer({ types: [TestSchema.Expando], storagePath });
    const db = await peer.createDatabase();
    for (let index = 0; index < OBJECTS; index++) {
      db.add(Obj.make(TestSchema.Expando, { value: index, label: `label-${index}` }));
      if (index % 100 === 99) {
        await db.flush();
      }
    }
    await db.flush();
    await peer.host.updateIndexes();

    const opens: number[] = [];
    const queries: number[] = [];
    const warm: number[] = [];
    for (let round = 0; round < ROUNDS; round++) {
      await peer.reload();
      const start = performance.now();
      const reopened = await peer.openLastDatabase();
      const opened = performance.now();
      const objects = await reopened.query(Filter.type(TestSchema.Expando)).run();
      const total = objects.reduce((sum, object) => sum + Number(object.value), 0);
      const queried = performance.now();
      expect(objects).toHaveLength(OBJECTS);
      expect(total).toBe((OBJECTS * (OBJECTS - 1)) / 2);
      // The same query again, with every object now resident: what is left is the query itself.
      const again = await reopened.query(Filter.type(TestSchema.Expando)).run();
      expect(again).toHaveLength(OBJECTS);
      opens.push(opened - start);
      queries.push(queried - opened);
      warm.push(performance.now() - queried);
    }
    // oxlint-disable-next-line no-console
    console.log(
      `cold query (${NAME}, ${OBJECTS} objects, ${ROUNDS} rounds): open ${median(opens).toFixed(1)} ms, ` +
        `query ${median(queries).toFixed(1)} ms, warm query ${median(warm).toFixed(1)} ms, total ${median(opens.map((open, index) => open + queries[index])).toFixed(1)} ms`,
    );
    rmSync(storagePath, { recursive: true, force: true });
  });
});
