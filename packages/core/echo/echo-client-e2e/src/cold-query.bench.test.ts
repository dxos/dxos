//
// Copyright 2026 DXOS.org
//

import { rmSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import { Filter, Obj } from '@dxos/echo';
import { EchoTestBuilder, createTmpPath } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';

// Run: DX_RUN_MANUAL_TESTS=1 pnpm exec vitest run src/cold-query.bench.test.ts
const NAME = 'echo';

/** One SQLite file; each builder opens its own connection to it. */
const createStorage = () => {
  const path = createTmpPath();
  return {
    path,
    makeBuilder: () => new EchoTestBuilder(),
    cleanup: () => rmSync(path, { recursive: true, force: true }),
  };
};

const OBJECTS = parseCount('COLD_QUERY_OBJECTS', 1_000);
const ROUNDS = parseCount('COLD_QUERY_ROUNDS', 7);

/**
 * Cold query: a file holds `OBJECTS` objects. Each round starts a new builder and peer on that file (a new
 * SQLite connection, or a new wasm instance), opens the database, and runs one query for every object. A second
 * query on the same database follows. Prints median open, first-query and repeat-query times; asserts that
 * every written object came back with its value.
 */
describe('cold query', { tags: ['manual'], timeout: 600_000 }, () => {
  test(`query ${OBJECTS} objects in a fresh peer`, async () => {
    const storage = createStorage();
    try {
      const written = new Map<string, number>();
      {
        await using builder = await storage.makeBuilder().open();
        const peer = await builder.createPeer({ types: [TestSchema.Expando], storagePath: storage.path });
        const db = await peer.createDatabase();
        for (let index = 0; index < OBJECTS; index++) {
          const object = db.add(Obj.make(TestSchema.Expando, { value: index, label: `label-${index}` }));
          written.set(object.id, index);
          if (index % 100 === 99) {
            await db.flush();
          }
        }
        await db.flush();
        await peer.host.updateIndexes();
      }

      const opens: number[] = [];
      const queries: number[] = [];
      const repeats: number[] = [];
      for (let round = 0; round < ROUNDS; round++) {
        const start = performance.now();
        await using builder = await storage.makeBuilder().open();
        const peer = await builder.createPeer({ types: [TestSchema.Expando], storagePath: storage.path });
        const db = await peer.openLastDatabase();
        const opened = performance.now();
        const objects = await db.query(Filter.type(TestSchema.Expando)).run();
        // Reading a field of each object builds all of them, as a view showing them would.
        const read = objects.map((object) => [object.id, Number(object.value)] as const);
        const queried = performance.now();
        const again = await db.query(Filter.type(TestSchema.Expando)).run();
        const repeated = performance.now();

        expect(new Map(read)).toEqual(written);
        expect(again).toHaveLength(OBJECTS);
        opens.push(opened - start);
        queries.push(queried - opened);
        repeats.push(repeated - queried);
      }
      // oxlint-disable-next-line no-console
      console.log(
        `cold query (${NAME}, ${OBJECTS} objects, ${ROUNDS} rounds): open ${median(opens).toFixed(1)} ms, ` +
          `first query ${median(queries).toFixed(1)} ms, repeat query ${median(repeats).toFixed(1)} ms, ` +
          `open + first query ${median(opens.map((open, index) => open + queries[index])).toFixed(1)} ms`,
      );
    } finally {
      storage.cleanup();
    }
  });
});

/** Middle sample, or the mean of the two middle samples for an even count. */
const median = (values: number[]): number => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/** A positive integer from the environment, so a typo fails before anything is written. */
function parseCount(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer, got ${process.env[name]}`);
  }
  return value;
}
