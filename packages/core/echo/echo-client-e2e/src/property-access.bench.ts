//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { rmSync } from 'node:fs';
import { afterAll, bench, describe } from 'vitest';

import { Feed, Obj, Type } from '@dxos/echo';
import { EchoTestBuilder, createTmpPath } from '@dxos/echo-client/testing';
import { DXN } from '@dxos/keys';

import { blackhole } from './testing/bench-util';

//
// Property-access cost of an ECHO object relative to a plain JS object, across the three object
// storage kinds. Complements `echo.bench.ts`, which measures database operations (insert / select /
// update / delete, each with a flush); this file deliberately never flushes, so what is left is the
// per-access cost of the reactive proxy itself — the surface an API optimization would move.
//
// Reading is a proxy `get` trap; writing must go through `Obj.update`, since a direct assignment on
// an initialized ECHO object throws. That asymmetry is the point of the matrix: a write carries the
// `Obj.update` transaction (change context + batched notification) on top of the `set` trap, so the
// batched row below reports what that transaction costs when amortized over ten sets.
//

// Powers of two: both pools are indexed by masking a monotonic cursor, which is branch-free and
// keeps the rotation off the measured path.
const OBJECT_POOL_SIZE = 64;
const OBJECT_POOL_MASK = OBJECT_POOL_SIZE - 1;
const VALUE_POOL_SIZE = 1_024;
const VALUE_POOL_MASK = VALUE_POOL_SIZE - 1;
const BATCH = 10;
const BENCH_OPTIONS = { time: 1_000 };

class BenchObject extends Type.makeObject<BenchObject>(DXN.make('com.example.type.benchObject', '0.1.0'))(
  // A closed struct rather than `TestSchema.Expando`: an expando's `Record` rest element adds a
  // dynamic-lookup path to every access, which would be folded into the proxy overhead this file
  // is trying to isolate. A closed struct is also the shape production types actually use.
  Schema.Struct({
    value: Schema.Number,
    label: Schema.String,
  }),
) {}

// Module-level setup, awaited before any `describe` registers, so every bench body below stays
// synchronous. An `async` body would add a microtask turn (~50-100ns) to every sample, which is an
// order of magnitude above a plain property read and would collapse the whole matrix into noise.
// Safe because `*.bench.ts` is outside the test runner's `include` — this file is only ever loaded
// by an explicit `vitest bench` run.
const storagePath = createTmpPath();
process.once('exit', () => {
  try {
    rmSync(storagePath, { recursive: true, force: true });
  } catch {
    // Best-effort: EchoTestBuilder.close() is async and can't run from a sync exit handler.
  }
});

const builder = await new EchoTestBuilder().open();
const peer = await builder.createPeer({ types: [Feed.Feed, BenchObject], storagePath });
const db = await peer.createDatabase();
const feed = db.add(Feed.make({ name: 'bench' }));
await db.flush();

const makeProps = (index: number) => ({ value: index, label: `label-${index}` });

// One pool per kind. Rotating over many objects rather than hammering one keeps a single value or
// branch from warming into a best case that never occurs in production, and — for the write
// benches — stops ten consecutive stores to one property from being dead-store eliminated.
const plainPool = Array.from({ length: OBJECT_POOL_SIZE }, (unusedValue, index) => makeProps(index));
const unpersistedPool = Array.from({ length: OBJECT_POOL_SIZE }, (unusedValue, index) =>
  Obj.make(BenchObject, makeProps(index)),
);
const automergePool = Array.from({ length: OBJECT_POOL_SIZE }, (unusedValue, index) =>
  db.add(Obj.make(BenchObject, makeProps(index))),
);
const feedPool = Array.from({ length: OBJECT_POOL_SIZE }, (unusedValue, index) =>
  db.add(Obj.make(BenchObject, makeProps(index)), { to: feed }),
);
await db.flush();

// Generated at runtime so the written value is not a literal V8 can constant-fold into the store.
const valuePool = Array.from({ length: VALUE_POOL_SIZE }, () => Math.floor(Math.random() * 1_000_000));

let cursor = 0;
let checksum = 0;

afterAll(() => {
  // The single sink for the whole file. `checksum` and the pools are closed over here, so they stay
  // live for the module's lifetime and V8 cannot prove either the benchmarked loads (which feed
  // `checksum`) or the benchmarked stores (which land in the pools) dead.
  blackhole([checksum, plainPool, unpersistedPool, automergePool, feedPool]);
});

//
// Each bench body writes its property access out literally instead of calling through a shared
// helper. V8's inline caches are keyed by bytecode location, not by closure identity, so a factory
// or a `variant.read()` indirection would funnel all four object kinds through one load site, turn
// it megamorphic, and inflate every row of the matrix. The repetition below is what keeps each
// access monomorphic and the four kinds comparable.
//
// `x10` rows are the empirical check that nothing was elided: if a `x10` row is not ~10x its `x1`
// row, the optimizer ate the body and the number is meaningless.
//

describe('property access (plain vs echo)', { tags: ['manual'], timeout: 300_000 }, () => {
  describe('plain object', () => {
    bench(
      'read x1',
      () => {
        checksum += plainPool[cursor++ & OBJECT_POOL_MASK].value;
      },
      BENCH_OPTIONS,
    );

    bench(
      `read x${BATCH}`,
      () => {
        for (let n = 0; n < BATCH; n++) {
          checksum += plainPool[cursor++ & OBJECT_POOL_MASK].value;
        }
      },
      BENCH_OPTIONS,
    );

    bench(
      'write x1',
      () => {
        plainPool[cursor++ & OBJECT_POOL_MASK].value = valuePool[cursor & VALUE_POOL_MASK];
      },
      BENCH_OPTIONS,
    );

    bench(
      `write x${BATCH}`,
      () => {
        for (let n = 0; n < BATCH; n++) {
          plainPool[cursor++ & OBJECT_POOL_MASK].value = valuePool[cursor & VALUE_POOL_MASK];
        }
      },
      BENCH_OPTIONS,
    );
  });

  describe('echo object (unpersisted)', () => {
    bench(
      'read x1',
      () => {
        checksum += unpersistedPool[cursor++ & OBJECT_POOL_MASK].value;
      },
      BENCH_OPTIONS,
    );

    bench(
      `read x${BATCH}`,
      () => {
        for (let n = 0; n < BATCH; n++) {
          checksum += unpersistedPool[cursor++ & OBJECT_POOL_MASK].value;
        }
      },
      BENCH_OPTIONS,
    );

    bench(
      'write x1',
      () => {
        Obj.update(unpersistedPool[cursor++ & OBJECT_POOL_MASK], (obj) => {
          obj.value = valuePool[cursor & VALUE_POOL_MASK];
        });
      },
      BENCH_OPTIONS,
    );

    bench(
      `write x${BATCH}`,
      () => {
        for (let n = 0; n < BATCH; n++) {
          Obj.update(unpersistedPool[cursor++ & OBJECT_POOL_MASK], (obj) => {
            obj.value = valuePool[cursor & VALUE_POOL_MASK];
          });
        }
      },
      BENCH_OPTIONS,
    );

    bench(
      `write x${BATCH} (batched in one Obj.update)`,
      () => {
        Obj.update(unpersistedPool[cursor++ & OBJECT_POOL_MASK], (obj) => {
          for (let n = 0; n < BATCH; n++) {
            obj.value = valuePool[(cursor + n) & VALUE_POOL_MASK];
          }
        });
      },
      BENCH_OPTIONS,
    );
  });

  describe('echo object (automerge)', () => {
    bench(
      'read x1',
      () => {
        checksum += automergePool[cursor++ & OBJECT_POOL_MASK].value;
      },
      BENCH_OPTIONS,
    );

    bench(
      `read x${BATCH}`,
      () => {
        for (let n = 0; n < BATCH; n++) {
          checksum += automergePool[cursor++ & OBJECT_POOL_MASK].value;
        }
      },
      BENCH_OPTIONS,
    );

    bench(
      'write x1',
      () => {
        Obj.update(automergePool[cursor++ & OBJECT_POOL_MASK], (obj) => {
          obj.value = valuePool[cursor & VALUE_POOL_MASK];
        });
      },
      BENCH_OPTIONS,
    );

    bench(
      `write x${BATCH}`,
      () => {
        for (let n = 0; n < BATCH; n++) {
          Obj.update(automergePool[cursor++ & OBJECT_POOL_MASK], (obj) => {
            obj.value = valuePool[cursor & VALUE_POOL_MASK];
          });
        }
      },
      BENCH_OPTIONS,
    );

    bench(
      `write x${BATCH} (batched in one Obj.update)`,
      () => {
        Obj.update(automergePool[cursor++ & OBJECT_POOL_MASK], (obj) => {
          for (let n = 0; n < BATCH; n++) {
            obj.value = valuePool[(cursor + n) & VALUE_POOL_MASK];
          }
        });
      },
      BENCH_OPTIONS,
    );
  });

  describe('echo object (feed)', () => {
    bench(
      'read x1',
      () => {
        checksum += feedPool[cursor++ & OBJECT_POOL_MASK].value;
      },
      BENCH_OPTIONS,
    );

    bench(
      `read x${BATCH}`,
      () => {
        for (let n = 0; n < BATCH; n++) {
          checksum += feedPool[cursor++ & OBJECT_POOL_MASK].value;
        }
      },
      BENCH_OPTIONS,
    );

    bench(
      'write x1',
      () => {
        Obj.update(feedPool[cursor++ & OBJECT_POOL_MASK], (obj) => {
          obj.value = valuePool[cursor & VALUE_POOL_MASK];
        });
      },
      BENCH_OPTIONS,
    );

    bench(
      `write x${BATCH}`,
      () => {
        for (let n = 0; n < BATCH; n++) {
          Obj.update(feedPool[cursor++ & OBJECT_POOL_MASK], (obj) => {
            obj.value = valuePool[cursor & VALUE_POOL_MASK];
          });
        }
      },
      BENCH_OPTIONS,
    );

    bench(
      `write x${BATCH} (batched in one Obj.update)`,
      () => {
        Obj.update(feedPool[cursor++ & OBJECT_POOL_MASK], (obj) => {
          for (let n = 0; n < BATCH; n++) {
            obj.value = valuePool[(cursor + n) & VALUE_POOL_MASK];
          }
        });
      },
      BENCH_OPTIONS,
    );
  });
});
