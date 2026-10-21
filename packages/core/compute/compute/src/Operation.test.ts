//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Schedule from 'effect/Schedule';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Database, Obj, Type } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { DXN, EID, EntityId } from '@dxos/keys';

import { RunAgainError } from './errors.ts';
import * as Operation from './Operation.ts';

const KEY = DXN.make('com.example.test.op');

describe('Operation visibility', () => {
  test('operations are hidden by default', ({ expect }) => {
    expect(
      Operation.isVisible(
        Operation.serialize(
          Operation.make({ input: Schema.Void, output: Schema.String, meta: { key: KEY, name: 'Test Op' } }),
        ),
      ),
    ).toBe(false);
  });

  test('visible combinator marks an operation visible', ({ expect }) => {
    expect(
      Operation.isVisible(
        Operation.serialize(
          Operation.make({ input: Schema.Void, output: Schema.String, meta: { key: KEY, name: 'Test Op' } }).pipe(
            Operation.visible,
          ),
        ),
      ),
    ).toBe(true);
  });

  test('annotate does not mutate the input definition', ({ expect }) => {
    const op = Operation.make({ input: Schema.Void, output: Schema.String, meta: { key: KEY, name: 'Test Op' } });
    const annotated = op.pipe(Operation.visible);
    expect(Operation.isVisible(Operation.serialize(annotated))).toBe(true);
    // The original definition is untouched — combinators return a fresh value.
    expect(Operation.isVisible(Operation.serialize(op))).toBe(false);
  });

  test('visible preserves the definition type so a handler still attaches', ({ expect }) => {
    // Type-preservation is a compile-time guarantee; this asserts the value path also works.
    const op = Operation.make({ input: Schema.Void, output: Schema.String, meta: { key: KEY, name: 'Test Op' } }).pipe(
      Operation.visible,
      (op) => Operation.withHandler(op, () => Effect.succeed('ok')),
    );
    expect(Operation.isOperationWithHandler(op)).toBe(true);
  });
});

describe('toolName', () => {
  const makeOp = (key: string) =>
    Operation.make({
      meta: { key: DXN.make(key as any), name: 'Display Copy' },
      input: Schema.Void,
      output: Schema.Void,
    });

  test('strips the constant operation prefix and kebab-cases each segment', ({ expect }) => {
    expect(Operation.toolNameFromKey('org.dxos.operation.compute.create')).toBe('compute-create');
    expect(Operation.toolNameFromKey('org.dxos.operation.compute.addArtifact')).toBe('compute-add-artifact');
    expect(Operation.toolNameFromKey('org.dxos.operation.assistantToolkit.runInstructions')).toBe(
      'assistant-toolkit-run-instructions',
    );
  });

  // The name must not track display copy: that was what made rewording a label rename the tool.
  test('is independent of meta.name', ({ expect }) => {
    const op = Operation.make({
      meta: { key: DXN.make('com.example.operation.compute.create'), name: 'Something Else Entirely' },
      input: Schema.Void,
      output: Schema.Void,
    });
    expect(Operation.toolName(op)).toBe('com-example-operation-compute-create');
  });

  test('a key outside the prefix keeps every segment', ({ expect }) => {
    expect(Operation.toolName(makeOp('com.example.operation.random'))).toBe('com-example-operation-random');
  });

  test('the namespace segment separates verbs that used to collide', ({ expect }) => {
    const names = ['markdown', 'script', 'sheet'].map((ns) =>
      Operation.toolName(makeOp(`org.dxos.operation.${ns}.create`)),
    );
    expect(new Set(names).size).toBe(3);
  });
});

describe('findToolNameCollisions', () => {
  const makeOp = (key: string) =>
    Operation.make({ meta: { key: DXN.make(key as any) }, input: Schema.Void, output: Schema.Void });

  // One operation bound by two skills reaches the check twice; that is the same tool, not a clash.
  test('a repeated binding of one operation is not a collision', ({ expect }) => {
    const op = makeOp('org.dxos.operation.compute.create');
    expect(Operation.findToolNameCollisions([op, op]).size).toBe(0);
  });

  test('reports nothing for distinct names', ({ expect }) => {
    const collisions = Operation.findToolNameCollisions([
      makeOp('org.dxos.operation.compute.create'),
      makeOp('org.dxos.operation.compute.remove'),
    ]);
    expect(collisions.size).toBe(0);
  });

  // Kebab-casing is not injective: a camelCase segment and an already-hyphenated one converge. No key
  // carries a hyphen today — the `operation-key-shape` rule forbids it — so this constructs the pair
  // rather than borrowing a real one, and stands as the regression test if one ever slips back in.
  test('catches a camelCase segment converging with an already-hyphenated one', ({ expect }) => {
    const collisions = Operation.findToolNameCollisions([
      makeOp('org.dxos.operation.computeSearch.fetch'),
      makeOp('org.dxos.operation.compute-search.fetch'),
    ]);
    expect([...collisions.keys()]).toEqual(['compute-search-fetch']);
    expect(collisions.get('compute-search-fetch')).toHaveLength(2);
  });
});

describe('tryToolNameFromKey', () => {
  test('derives the same name as toolNameFromKey for a well-formed key', ({ expect }) => {
    expect(Operation.tryToolNameFromKey('org.dxos.operation.compute.create')).toBe('compute-create');
  });

  // Registry records arrive as JSON, so a key that cannot yield a valid name must cost only its own
  // tool — the throwing variant would abort every tool in the projection.
  test('returns undefined for a key that cannot yield a valid name', ({ expect }) => {
    expect(Operation.tryToolNameFromKey('org.dxos.operation.9bad.go')).toBeUndefined();
    expect(Operation.tryToolNameFromKey('')).toBeUndefined();
    expect(() => Operation.toolNameFromKey('org.dxos.operation.9bad.go')).toThrow();
  });
});

class Item extends Type.makeObject<Item>(DXN.make('com.example.type.item', '0.1.0'))(
  Schema.Struct({ name: Schema.String }),
) {}

describe('loadReplicated', () => {
  const retries = Schedule.spaced('20 millis').pipe(Schedule.upTo({ times: 10 }));

  /** Loads `entityId` from a test database, reporting how the load ended. */
  const load = (entityId: EntityId, arriving?: Item) =>
    EffectEx.runPromise(
      Effect.gen(function* () {
        const { db } = yield* Database.Service;
        const ref = db.makeRef<Item>(EID.make({ entityId }));
        const arrival = arriving
          ? yield* Effect.sleep('50 millis').pipe(
              Effect.andThen(Effect.sync(() => db.add(arriving))),
              Effect.forkChild,
            )
          : undefined;
        const outcome = yield* Operation.loadReplicated(ref, { retries }).pipe(
          Effect.map((item) => item.name),
          Effect.catchTag('EntityNotFoundError', () => Effect.succeed('not found')),
          Effect.catchDefect((defect) => Effect.succeed(RunAgainError.is(defect) ? 'run again' : 'died')),
        );
        if (arrival) {
          yield* Fiber.join(arrival);
        }
        return outcome;
      }).pipe(Effect.provide(TestDatabaseLayer({ types: [Item] }))),
    );

  test('an object that arrives during the retries loads', async ({ expect }) => {
    const item = Obj.make(Item, { name: 'late' });
    expect(await load(item.id, item)).toBe('late');
  });

  test('a new object that does not arrive runs the operation again', async ({ expect }) => {
    expect(await load(EntityId.random())).toBe('run again');
  });

  test('an old object that does not arrive is not found', async ({ expect }) => {
    expect(await load(EntityId.deterministic('long gone'))).toBe('not found');
  });
});
