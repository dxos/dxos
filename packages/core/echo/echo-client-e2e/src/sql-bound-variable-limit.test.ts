//
// Copyright 2026 DXOS.org
//

import { DatabaseSync, type StatementSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { Filter, Obj, Query } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';
import { SQL_MAX_BOUND_VARIABLES } from '@dxos/index-core';
import { range } from '@dxos/util';

/** Enough objects that the indexer fills several passes, so a batch is wide enough to overrun. */
const OBJECT_COUNT = 600;

/**
 * Records the bound-variable count of every statement the node SQLite driver executes, by wrapping
 * `DatabaseSync.prototype.prepare` — the one place all of `@effect/sql-sqlite-node`'s paths pass
 * through, so no index can add a wide statement that escapes this.
 *
 * Node SQLite caps `SQLITE_LIMIT_VARIABLE_NUMBER` far higher than the 100 Durable Object SQLite
 * allows, and `node:sqlite` exposes no `sqlite3_limit` to lower it, so an end-to-end write here
 * cannot fail the way production did. Observing the counts is what makes the production limit
 * testable on this runtime.
 */
const recordBoundVariableCounts = (): { max: () => number; widest: () => string } => {
  const original = DatabaseSync.prototype.prepare;
  let max = 0;
  let widest = '';

  DatabaseSync.prototype.prepare = function patched(sql: string): StatementSync {
    const statement = original.call(this, sql);
    const observe = (count: number): void => {
      if (count > max) {
        max = count;
        widest = sql;
      }
    };

    return new Proxy(statement, {
      get: (target, property, receiver) => {
        const value = Reflect.get(target, property, receiver);
        if (typeof value !== 'function') {
          return value;
        }
        // Bound to `target`: the native methods reject a proxy as their receiver.
        const method = value.bind(target);
        if (property !== 'all' && property !== 'run' && property !== 'get' && property !== 'iterate') {
          return method;
        }
        return (...params: unknown[]) => {
          observe(params.length);
          return method(...params);
        };
      },
    });
  };

  onTestFinished(() => {
    DatabaseSync.prototype.prepare = original;
  });

  return { max: () => max, widest: () => widest };
};

describe('SQLite bound-variable limit', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  // Seeding 600 objects while every `prepare` is instrumented costs ~7 s of real work, so the 15 s
  // default leaves no room on a loaded shard; the subject here is statement width, not latency.
  test(
    'indexing a large space stays within the bound-variable limit and keeps objects queryable',
    { timeout: 30_000 },
    async () => {
      const statements = recordBoundVariableCounts();

      await using peer = await builder.createPeer();
      await using db = await peer.createDatabase();

      const titles = range(OBJECT_COUNT).map((index) => `bound-variable-subject-${index}`);
      for (const title of titles) {
        db.add(Obj.make(TestSchema.Expando, { title }));
      }
      await db.flush();
      await peer.host.updateIndexes();

      // The real read path: a client query answered from the indexes the pass above wrote. Every
      // object must come back — an indexing pass that threw part way leaves the rest silently
      // unfindable, which is how the production outage presented.
      const objects = await db.query(Query.select(Filter.everything()).limit(OBJECT_COUNT * 2)).run();
      expect(objects).to.have.length(OBJECT_COUNT);

      expect(statements.max(), `widest statement: ${statements.widest()}`).toBeLessThanOrEqual(SQL_MAX_BOUND_VARIABLES);
    },
  );
});
