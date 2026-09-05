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
// update / delete, each with a flush); no measured body here ever flushes, so what is left is the
// per-access cost of the reactive proxy itself — the surface an API optimization would move. Flushes
// happen only in row teardown, outside every timed window (see `flushing`).
//
// Reading is a proxy `get` trap; writing must go through `Obj.update`, since a direct assignment on
// an initialized ECHO object throws. That asymmetry is the point of the matrix: a write carries the
// `Obj.update` transaction (change context + batched notification) on top of the `set` trap, so the
// batched row below reports what that transaction costs when amortized over ten sets.
//
// `make` rows price construction: `Obj.make` against a plain object literal, and — for the
// persisted kinds — `Obj.make` plus `db.add`, since an object that never reaches the database is
// already covered by the unpersisted row. They run last in each block on purpose: they are the only
// rows that grow the database, and running them first would leave every read and write after them
// measuring a doc inflated by the preceding row rather than the pool the block set up. Ordering only
// settles this within a block — across blocks it is the per-kind database above that does.
//
// The `x1` rows carry ~85ns of tinybench per-callback overhead, which swamps anything cheaper than
// it — every plain-object row is below that floor. Recover a per-operation cost that cancels it with
// `(mean(x10) - mean(x1)) / 9` rather than reading a fast `x1` row directly.
//

// Powers of two: both pools are indexed by masking a monotonic cursor, which is branch-free and
// keeps the rotation off the measured path.
const OBJECT_POOL_SIZE = 64;
const OBJECT_POOL_MASK = OBJECT_POOL_SIZE - 1;
const VALUE_POOL_SIZE = 1_024;
const VALUE_POOL_MASK = VALUE_POOL_SIZE - 1;
// Ring the `make` benches park each constructed object in, so it escapes the frame (see
// `makeSink`). Bounded, so the retained set stays flat while the rest becomes garbage.
const MAKE_SINK_SIZE = 64;
const MAKE_SINK_MASK = MAKE_SINK_SIZE - 1;
const BATCH = 10;
const BENCH_OPTIONS = { time: 1_000 };
// The `make` rows run a shorter window than the rest: the persisted kinds insert a new object per
// iteration, and within a row nothing flushes, so a full second would grow the document enough to
// distort the tail of that row (and strain memory). Uniform across all four kinds so the make rows
// stay comparable to each other; hz is normalized, so the shorter window costs resolution, not
// correctness.
const MAKE_BENCH_OPTIONS = { time: 250 };

class BenchObject extends Type.makeObject<BenchObject>(DXN.make('com.example.type.benchObject', '0.1.0'))(
  // A closed struct rather than `TestSchema.Expando`: an expando's `Record` rest element adds a
  // dynamic-lookup path to every access, which would be folded into the proxy overhead this file
  // is trying to isolate. A closed struct is also the shape production types actually use.
  Schema.Struct({
    value: Schema.Number,
    label: Schema.String,
  }),
) {}

// The wide variant pads the same two fields out to `WIDE_FIELD_COUNT` short strings and still reads
// and writes only `value`, to separate what an access costs per object from what it costs per field.
// If a single-field read on a wide object is no slower than on a narrow one, the proxy is paying per
// access; if it scales with width, something is walking or materializing the whole object.
const WIDE_FIELD_COUNT = 250;
const wideFieldName = (index: number) => `field${index}`;
const wideSchemaFields = Object.fromEntries(
  Array.from({ length: WIDE_FIELD_COUNT }, (unusedValue, index) => [wideFieldName(index), Schema.String]),
);

class WideBenchObject extends Type.makeObject<WideBenchObject>(DXN.make('com.example.type.wideBenchObject', '0.1.0'))(
  Schema.Struct({
    value: Schema.Number,
    label: Schema.String,
    ...wideSchemaFields,
  }),
) {}

// Module-level setup, awaited before any `describe` registers, so every bench body below stays
// synchronous. An `async` body would add a microtask turn (~50-100ns) to every sample, which is an
// order of magnitude above a plain property read and would collapse the whole matrix into noise.
// Safe because `*.bench.ts` is outside the test runner's `include` — this file is only ever loaded
// by an explicit `vitest bench` run.
const storagePaths = [createTmpPath(), createTmpPath(), createTmpPath(), createTmpPath()];
process.once('exit', () => {
  for (const storagePath of storagePaths) {
    try {
      rmSync(storagePath, { recursive: true, force: true });
    } catch {
      // Best-effort: EchoTestBuilder.close() is async and can't run from a sync exit handler.
    }
  }
});

const builder = await new EchoTestBuilder().open();

const openDatabase = async (storagePath: string) => {
  const peer = await builder.createPeer({ types: [Feed.Feed, BenchObject, WideBenchObject], storagePath });
  return peer.createDatabase();
};

// A database per persisted kind and width rather than one shared between them. Every row mutates the
// database it runs against — `make` adds objects that persist across rows — so on a shared database
// each block would be measured against a database sized by whichever blocks happened to run before
// it, by an amount that varies with their iteration counts.
const automergeDb = await openDatabase(storagePaths[0]);
const feedDb = await openDatabase(storagePaths[1]);
const automergeWideDb = await openDatabase(storagePaths[2]);
const feedWideDb = await openDatabase(storagePaths[3]);
const feed = feedDb.add(Feed.make({ name: 'bench' }));
const wideFeed = feedWideDb.add(Feed.make({ name: 'bench-wide' }));
await feedDb.flush();
await feedWideDb.flush();

const makeProps = (index: number) => ({ value: index, label: `label-${index}` });

// The padding fields, built once. Generated at runtime so the strings are not literals V8 can fold,
// and spread rather than rebuilt per iteration so the wide `make` rows measure constructing a wide
// object rather than the array churn of assembling its field map.
const widePadding: Record<string, string> = Object.fromEntries(
  Array.from({ length: WIDE_FIELD_COUNT }, (unusedValue, index) => [
    wideFieldName(index),
    `s${index}-${Math.floor(Math.random() * 1_000)}`,
  ]),
);
const makeWideProps = (index: number) => ({ ...widePadding, ...makeProps(index) });

// One pool per kind. Rotating over many objects rather than hammering one keeps a single value or
// branch from warming into a best case that never occurs in production, and — for the write
// benches — stops ten consecutive stores to one property from being dead-store eliminated.
const plainPool = Array.from({ length: OBJECT_POOL_SIZE }, (unusedValue, index) => makeProps(index));
const unpersistedPool = Array.from({ length: OBJECT_POOL_SIZE }, (unusedValue, index) =>
  Obj.make(BenchObject, makeProps(index)),
);
const automergePool = Array.from({ length: OBJECT_POOL_SIZE }, (unusedValue, index) =>
  automergeDb.add(Obj.make(BenchObject, makeProps(index))),
);
const feedPool = Array.from({ length: OBJECT_POOL_SIZE }, (unusedValue, index) =>
  feedDb.add(Obj.make(BenchObject, makeProps(index)), { to: feed }),
);
const plainWidePool = Array.from({ length: OBJECT_POOL_SIZE }, (unusedValue, index) => makeWideProps(index));
const unpersistedWidePool = Array.from({ length: OBJECT_POOL_SIZE }, (unusedValue, index) =>
  Obj.make(WideBenchObject, makeWideProps(index)),
);
const automergeWidePool = Array.from({ length: OBJECT_POOL_SIZE }, (unusedValue, index) =>
  automergeWideDb.add(Obj.make(WideBenchObject, makeWideProps(index))),
);
const feedWidePool = Array.from({ length: OBJECT_POOL_SIZE }, (unusedValue, index) =>
  feedWideDb.add(Obj.make(WideBenchObject, makeWideProps(index)), { to: wideFeed }),
);
await automergeDb.flush();
await feedDb.flush();
await automergeWideDb.flush();
await feedWideDb.flush();

// Flushes a persisted row's database once, before its warmup phase. tinybench `setup` is awaited, so
// the drain completes before any iteration runs; it has to be `setup` and not `teardown`, which
// tinybench fires without awaiting — an async flush there overlaps the next row's iterations and is
// still in flight at `afterAll`. Without any per-row drain, pending changes accumulate across the
// whole block, and `DataService.update` ships them in a single RPC under a 30s timeout; a block's
// worth on 250-field objects does not fit.
//
// Before warmup only, not before run: a flush leaves background persistence settling for a while,
// and draining right before the timed phase put that settling inside it — feed writes read 2x and
// an automerge make row went bimodal. Warmup exists to absorb exactly that transient, so the drain
// sits ahead of it and the run phase sees steady state. Pending state is then bounded to one row's
// warmup plus run, which the drain of the next row carries.
const flushing = (db: typeof automergeDb, options: typeof BENCH_OPTIONS) => ({
  ...options,
  setup: (_task: unknown, mode: 'warmup' | 'run') => (mode === 'warmup' ? db.flush() : undefined),
});

// Generated at runtime so the written value is not a literal V8 can constant-fold into the store.
const valuePool = Array.from({ length: VALUE_POOL_SIZE }, () => Math.floor(Math.random() * 1_000_000));
// Pre-built so the `make` rows measure object construction rather than string concatenation.
const labelPool = Array.from({ length: VALUE_POOL_SIZE }, (unusedValue, index) => `label-${index}`);

// Every constructed object is parked here. Escape analysis scalar-replaces an allocation that never
// leaves the frame — the allocation disappears and the row reports a speed no caller can observe,
// which is the most common way an allocation bench lies. Storing into a heap array that outlives the
// frame forces the object to escape. (`db.add` already does this for the persisted kinds; the ring
// is what covers plain and unpersisted, and keeps all four measuring the same shape of work.)
const makeSink: unknown[] = new Array(MAKE_SINK_SIZE).fill(null);

let cursor = 0;
let checksum = 0;

afterAll(async () => {
  // The single sink for the whole file. `checksum` and the pools are closed over here, so they stay
  // live for the module's lifetime and V8 cannot prove either the benchmarked loads (which feed
  // `checksum`) or the benchmarked stores (which land in the pools) dead.
  blackhole([
    checksum,
    plainPool,
    unpersistedPool,
    automergePool,
    feedPool,
    plainWidePool,
    unpersistedWidePool,
    automergeWidePool,
    feedWidePool,
    makeSink,
  ]);
  // Each persisted row already drains in its `setup` (see `flushing`), so these only flush what the
  // final row of each block left behind. Sequential rather than inside `builder.close()`, which
  // closes four peers in parallel and could not say which one was slow if it timed out.
  await automergeDb.flush();
  await feedDb.flush();
  await automergeWideDb.flush();
  await feedWideDb.flush();
  // Closes the peers and disposes their storage. The exit handler above only unlinks the directory,
  // and cannot await this — which is why the close belongs here, where a hook can be async.
  await builder.close();
  // vitest's default hook budget is 10s, sized for unit tests. Draining four databases and closing
  // four peers is legitimately slower than that; the 30s RPC timeout inside `flush` still fires as a
  // real error if a single drain is too large, so this raises the hook budget without hiding one.
}, 120_000);

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

    bench(
      'make x1',
      () => {
        const index = cursor++ & VALUE_POOL_MASK;
        makeSink[index & MAKE_SINK_MASK] = { value: valuePool[index], label: labelPool[index] };
      },
      MAKE_BENCH_OPTIONS,
    );

    bench(
      `make x${BATCH}`,
      () => {
        for (let n = 0; n < BATCH; n++) {
          const index = cursor++ & VALUE_POOL_MASK;
          makeSink[index & MAKE_SINK_MASK] = { value: valuePool[index], label: labelPool[index] };
        }
      },
      MAKE_BENCH_OPTIONS,
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

    bench(
      'make x1',
      () => {
        const index = cursor++ & VALUE_POOL_MASK;
        makeSink[index & MAKE_SINK_MASK] = Obj.make(BenchObject, {
          value: valuePool[index],
          label: labelPool[index],
        });
      },
      MAKE_BENCH_OPTIONS,
    );

    bench(
      `make x${BATCH}`,
      () => {
        for (let n = 0; n < BATCH; n++) {
          const index = cursor++ & VALUE_POOL_MASK;
          makeSink[index & MAKE_SINK_MASK] = Obj.make(BenchObject, {
            value: valuePool[index],
            label: labelPool[index],
          });
        }
      },
      MAKE_BENCH_OPTIONS,
    );
  });

  describe('echo object (automerge)', () => {
    bench(
      'read x1',
      () => {
        checksum += automergePool[cursor++ & OBJECT_POOL_MASK].value;
      },
      flushing(automergeDb, BENCH_OPTIONS),
    );

    bench(
      `read x${BATCH}`,
      () => {
        for (let n = 0; n < BATCH; n++) {
          checksum += automergePool[cursor++ & OBJECT_POOL_MASK].value;
        }
      },
      flushing(automergeDb, BENCH_OPTIONS),
    );

    bench(
      'write x1',
      () => {
        Obj.update(automergePool[cursor++ & OBJECT_POOL_MASK], (obj) => {
          obj.value = valuePool[cursor & VALUE_POOL_MASK];
        });
      },
      flushing(automergeDb, BENCH_OPTIONS),
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
      flushing(automergeDb, BENCH_OPTIONS),
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
      flushing(automergeDb, BENCH_OPTIONS),
    );

    // `make` here is construction plus `db.add` — the object has to reach the database for the row
    // to mean anything, and the proxy alone is already priced by the unpersisted row above.
    bench(
      'make x1 (Obj.make + db.add)',
      () => {
        const index = cursor++ & VALUE_POOL_MASK;
        makeSink[index & MAKE_SINK_MASK] = automergeDb.add(
          Obj.make(BenchObject, { value: valuePool[index], label: labelPool[index] }),
        );
      },
      flushing(automergeDb, MAKE_BENCH_OPTIONS),
    );

    bench(
      `make x${BATCH} (Obj.make + db.add)`,
      () => {
        for (let n = 0; n < BATCH; n++) {
          const index = cursor++ & VALUE_POOL_MASK;
          makeSink[index & MAKE_SINK_MASK] = automergeDb.add(
            Obj.make(BenchObject, { value: valuePool[index], label: labelPool[index] }),
          );
        }
      },
      flushing(automergeDb, MAKE_BENCH_OPTIONS),
    );
  });

  describe('echo object (feed)', () => {
    bench(
      'read x1',
      () => {
        checksum += feedPool[cursor++ & OBJECT_POOL_MASK].value;
      },
      flushing(feedDb, BENCH_OPTIONS),
    );

    bench(
      `read x${BATCH}`,
      () => {
        for (let n = 0; n < BATCH; n++) {
          checksum += feedPool[cursor++ & OBJECT_POOL_MASK].value;
        }
      },
      flushing(feedDb, BENCH_OPTIONS),
    );

    bench(
      'write x1',
      () => {
        Obj.update(feedPool[cursor++ & OBJECT_POOL_MASK], (obj) => {
          obj.value = valuePool[cursor & VALUE_POOL_MASK];
        });
      },
      flushing(feedDb, BENCH_OPTIONS),
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
      flushing(feedDb, BENCH_OPTIONS),
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
      flushing(feedDb, BENCH_OPTIONS),
    );

    bench(
      'make x1 (Obj.make + db.add to feed)',
      () => {
        const index = cursor++ & VALUE_POOL_MASK;
        makeSink[index & MAKE_SINK_MASK] = feedDb.add(
          Obj.make(BenchObject, { value: valuePool[index], label: labelPool[index] }),
          { to: feed },
        );
      },
      flushing(feedDb, MAKE_BENCH_OPTIONS),
    );

    bench(
      `make x${BATCH} (Obj.make + db.add to feed)`,
      () => {
        for (let n = 0; n < BATCH; n++) {
          const index = cursor++ & VALUE_POOL_MASK;
          makeSink[index & MAKE_SINK_MASK] = feedDb.add(
            Obj.make(BenchObject, { value: valuePool[index], label: labelPool[index] }),
            { to: feed },
          );
        }
      },
      flushing(feedDb, MAKE_BENCH_OPTIONS),
    );
  });
});

// Same matrix over the wide object. Kept as separate bench bodies rather than parameterized over the
// narrow ones for the same monomorphism reason as above — a wide and a narrow object are different
// hidden classes, so sharing a load site between them would make it polymorphic and slow both.
describe(
  `property access (plain vs echo) — wide object, ${WIDE_FIELD_COUNT} fields`,
  { tags: ['manual'], timeout: 300_000 },
  () => {
    describe('plain object', () => {
      bench(
        'read x1',
        () => {
          checksum += plainWidePool[cursor++ & OBJECT_POOL_MASK].value;
        },
        BENCH_OPTIONS,
      );

      bench(
        `read x${BATCH}`,
        () => {
          for (let n = 0; n < BATCH; n++) {
            checksum += plainWidePool[cursor++ & OBJECT_POOL_MASK].value;
          }
        },
        BENCH_OPTIONS,
      );

      bench(
        'write x1',
        () => {
          plainWidePool[cursor++ & OBJECT_POOL_MASK].value = valuePool[cursor & VALUE_POOL_MASK];
        },
        BENCH_OPTIONS,
      );

      bench(
        `write x${BATCH}`,
        () => {
          for (let n = 0; n < BATCH; n++) {
            plainWidePool[cursor++ & OBJECT_POOL_MASK].value = valuePool[cursor & VALUE_POOL_MASK];
          }
        },
        BENCH_OPTIONS,
      );

      bench(
        'make x1',
        () => {
          const index = cursor++ & VALUE_POOL_MASK;
          makeSink[index & MAKE_SINK_MASK] = { ...widePadding, value: valuePool[index], label: labelPool[index] };
        },
        MAKE_BENCH_OPTIONS,
      );

      bench(
        `make x${BATCH}`,
        () => {
          for (let n = 0; n < BATCH; n++) {
            const index = cursor++ & VALUE_POOL_MASK;
            makeSink[index & MAKE_SINK_MASK] = { ...widePadding, value: valuePool[index], label: labelPool[index] };
          }
        },
        MAKE_BENCH_OPTIONS,
      );
    });

    describe('echo object (unpersisted)', () => {
      bench(
        'read x1',
        () => {
          checksum += unpersistedWidePool[cursor++ & OBJECT_POOL_MASK].value;
        },
        BENCH_OPTIONS,
      );

      bench(
        `read x${BATCH}`,
        () => {
          for (let n = 0; n < BATCH; n++) {
            checksum += unpersistedWidePool[cursor++ & OBJECT_POOL_MASK].value;
          }
        },
        BENCH_OPTIONS,
      );

      bench(
        'write x1',
        () => {
          Obj.update(unpersistedWidePool[cursor++ & OBJECT_POOL_MASK], (obj) => {
            obj.value = valuePool[cursor & VALUE_POOL_MASK];
          });
        },
        BENCH_OPTIONS,
      );

      bench(
        `write x${BATCH}`,
        () => {
          for (let n = 0; n < BATCH; n++) {
            Obj.update(unpersistedWidePool[cursor++ & OBJECT_POOL_MASK], (obj) => {
              obj.value = valuePool[cursor & VALUE_POOL_MASK];
            });
          }
        },
        BENCH_OPTIONS,
      );

      bench(
        `write x${BATCH} (batched in one Obj.update)`,
        () => {
          Obj.update(unpersistedWidePool[cursor++ & OBJECT_POOL_MASK], (obj) => {
            for (let n = 0; n < BATCH; n++) {
              obj.value = valuePool[(cursor + n) & VALUE_POOL_MASK];
            }
          });
        },
        BENCH_OPTIONS,
      );

      bench(
        'make x1',
        () => {
          const index = cursor++ & VALUE_POOL_MASK;
          makeSink[index & MAKE_SINK_MASK] = Obj.make(WideBenchObject, {
            ...widePadding,
            value: valuePool[index],
            label: labelPool[index],
          });
        },
        MAKE_BENCH_OPTIONS,
      );

      bench(
        `make x${BATCH}`,
        () => {
          for (let n = 0; n < BATCH; n++) {
            const index = cursor++ & VALUE_POOL_MASK;
            makeSink[index & MAKE_SINK_MASK] = Obj.make(WideBenchObject, {
              ...widePadding,
              value: valuePool[index],
              label: labelPool[index],
            });
          }
        },
        MAKE_BENCH_OPTIONS,
      );
    });

    describe('echo object (automerge)', () => {
      bench(
        'read x1',
        () => {
          checksum += automergeWidePool[cursor++ & OBJECT_POOL_MASK].value;
        },
        flushing(automergeWideDb, BENCH_OPTIONS),
      );

      bench(
        `read x${BATCH}`,
        () => {
          for (let n = 0; n < BATCH; n++) {
            checksum += automergeWidePool[cursor++ & OBJECT_POOL_MASK].value;
          }
        },
        flushing(automergeWideDb, BENCH_OPTIONS),
      );

      bench(
        'write x1',
        () => {
          Obj.update(automergeWidePool[cursor++ & OBJECT_POOL_MASK], (obj) => {
            obj.value = valuePool[cursor & VALUE_POOL_MASK];
          });
        },
        flushing(automergeWideDb, BENCH_OPTIONS),
      );

      bench(
        `write x${BATCH}`,
        () => {
          for (let n = 0; n < BATCH; n++) {
            Obj.update(automergeWidePool[cursor++ & OBJECT_POOL_MASK], (obj) => {
              obj.value = valuePool[cursor & VALUE_POOL_MASK];
            });
          }
        },
        flushing(automergeWideDb, BENCH_OPTIONS),
      );

      bench(
        `write x${BATCH} (batched in one Obj.update)`,
        () => {
          Obj.update(automergeWidePool[cursor++ & OBJECT_POOL_MASK], (obj) => {
            for (let n = 0; n < BATCH; n++) {
              obj.value = valuePool[(cursor + n) & VALUE_POOL_MASK];
            }
          });
        },
        flushing(automergeWideDb, BENCH_OPTIONS),
      );

      bench(
        'make x1 (Obj.make + db.add)',
        () => {
          const index = cursor++ & VALUE_POOL_MASK;
          makeSink[index & MAKE_SINK_MASK] = automergeWideDb.add(
            Obj.make(WideBenchObject, { ...widePadding, value: valuePool[index], label: labelPool[index] }),
          );
        },
        flushing(automergeWideDb, MAKE_BENCH_OPTIONS),
      );

      bench(
        `make x${BATCH} (Obj.make + db.add)`,
        () => {
          for (let n = 0; n < BATCH; n++) {
            const index = cursor++ & VALUE_POOL_MASK;
            makeSink[index & MAKE_SINK_MASK] = automergeWideDb.add(
              Obj.make(WideBenchObject, { ...widePadding, value: valuePool[index], label: labelPool[index] }),
            );
          }
        },
        flushing(automergeWideDb, MAKE_BENCH_OPTIONS),
      );
    });

    describe('echo object (feed)', () => {
      bench(
        'read x1',
        () => {
          checksum += feedWidePool[cursor++ & OBJECT_POOL_MASK].value;
        },
        flushing(feedWideDb, BENCH_OPTIONS),
      );

      bench(
        `read x${BATCH}`,
        () => {
          for (let n = 0; n < BATCH; n++) {
            checksum += feedWidePool[cursor++ & OBJECT_POOL_MASK].value;
          }
        },
        flushing(feedWideDb, BENCH_OPTIONS),
      );

      bench(
        'write x1',
        () => {
          Obj.update(feedWidePool[cursor++ & OBJECT_POOL_MASK], (obj) => {
            obj.value = valuePool[cursor & VALUE_POOL_MASK];
          });
        },
        flushing(feedWideDb, BENCH_OPTIONS),
      );

      bench(
        `write x${BATCH}`,
        () => {
          for (let n = 0; n < BATCH; n++) {
            Obj.update(feedWidePool[cursor++ & OBJECT_POOL_MASK], (obj) => {
              obj.value = valuePool[cursor & VALUE_POOL_MASK];
            });
          }
        },
        flushing(feedWideDb, BENCH_OPTIONS),
      );

      bench(
        `write x${BATCH} (batched in one Obj.update)`,
        () => {
          Obj.update(feedWidePool[cursor++ & OBJECT_POOL_MASK], (obj) => {
            for (let n = 0; n < BATCH; n++) {
              obj.value = valuePool[(cursor + n) & VALUE_POOL_MASK];
            }
          });
        },
        flushing(feedWideDb, BENCH_OPTIONS),
      );

      bench(
        'make x1 (Obj.make + db.add to feed)',
        () => {
          const index = cursor++ & VALUE_POOL_MASK;
          makeSink[index & MAKE_SINK_MASK] = feedWideDb.add(
            Obj.make(WideBenchObject, { ...widePadding, value: valuePool[index], label: labelPool[index] }),
            { to: wideFeed },
          );
        },
        flushing(feedWideDb, MAKE_BENCH_OPTIONS),
      );

      bench(
        `make x${BATCH} (Obj.make + db.add to feed)`,
        () => {
          for (let n = 0; n < BATCH; n++) {
            const index = cursor++ & VALUE_POOL_MASK;
            makeSink[index & MAKE_SINK_MASK] = feedWideDb.add(
              Obj.make(WideBenchObject, { ...widePadding, value: valuePool[index], label: labelPool[index] }),
              { to: wideFeed },
            );
          }
        },
        flushing(feedWideDb, MAKE_BENCH_OPTIONS),
      );
    });
  },
);
