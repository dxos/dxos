//
// Copyright 2026 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';

import * as Operation from './Operation';
import * as OperationHandlerSet from './OperationHandlerSet';

const KEY_A = DXN.make('org.example.test.a');
const KEY_B = DXN.make('org.example.test.b');

const makeHandler = (key: DXN.DXN, output: string) =>
  Operation.withHandler(Operation.make({ input: Schema.Void, output: Schema.String, meta: { key } }), () =>
    Effect.succeed(output),
  );

describe('OperationHandlerSet.reactive', () => {
  test('merges handlers from contributed sets', async ({ expect }) => {
    const registry = Registry.make();
    const setA = OperationHandlerSet.make(makeHandler(KEY_A, 'A'));
    const setB = OperationHandlerSet.make(makeHandler(KEY_B, 'B'));
    const atom = Atom.make<readonly OperationHandlerSet.OperationHandlerSet[]>([setA, setB]).pipe(Atom.keepAlive);
    registry.mount(atom);

    const reactive = OperationHandlerSet.reactive(registry, atom);
    const handlers = await reactive.getHandlers();
    expect(handlers.map((handler) => handler.meta.key).sort()).toEqual([KEY_A, KEY_B]);
  });

  test('caches the merged result across calls', async ({ expect }) => {
    const registry = Registry.make();
    let resolveCount = 0;
    const trackingSet: OperationHandlerSet.OperationHandlerSet = {
      [OperationHandlerSet.TypeId]: OperationHandlerSet.TypeId,
      getHandlers: () => Promise.resolve([makeHandler(KEY_A, 'A')]),
      handlers: Effect.sync(() => {
        resolveCount++;
        return [makeHandler(KEY_A, 'A')];
      }),
    };
    const atom = Atom.make<readonly OperationHandlerSet.OperationHandlerSet[]>([trackingSet]).pipe(Atom.keepAlive);
    registry.mount(atom);

    const reactive = OperationHandlerSet.reactive(registry, atom);
    await reactive.getHandlers();
    await reactive.getHandlers();
    await reactive.getHandlers();
    expect(resolveCount).toBe(1);
  });

  test('retries after a rejection rather than caching the failure', async ({ expect }) => {
    const registry = Registry.make();
    let callCount = 0;
    const flakySet: OperationHandlerSet.OperationHandlerSet = {
      [OperationHandlerSet.TypeId]: OperationHandlerSet.TypeId,
      getHandlers: () => Promise.resolve([]),
      handlers: Effect.suspend(() => {
        callCount++;
        if (callCount === 1) {
          return Effect.promise(() => Promise.reject(new Error('transient')));
        }
        return Effect.succeed([makeHandler(KEY_A, 'A')]);
      }),
    };
    const atom = Atom.make<readonly OperationHandlerSet.OperationHandlerSet[]>([flakySet]).pipe(Atom.keepAlive);
    registry.mount(atom);

    const reactive = OperationHandlerSet.reactive(registry, atom);
    await expect(reactive.getHandlers()).rejects.toThrow('transient');
    const retried = await reactive.getHandlers();
    expect(retried.map((handler) => handler.meta.key)).toEqual([KEY_A]);
    expect(callCount).toBe(2);
  });

  test('invalidates and re-resolves when the atom changes', async ({ expect }) => {
    const registry = Registry.make();
    const setA = OperationHandlerSet.make(makeHandler(KEY_A, 'A'));
    const setB = OperationHandlerSet.make(makeHandler(KEY_B, 'B'));
    const atom = Atom.make<readonly OperationHandlerSet.OperationHandlerSet[]>([setA]).pipe(Atom.keepAlive);
    registry.mount(atom);

    const reactive = OperationHandlerSet.reactive(registry, atom);
    expect((await reactive.getHandlers()).map((handler) => handler.meta.key)).toEqual([KEY_A]);

    registry.set(atom, [setA, setB]);
    expect((await reactive.getHandlers()).map((handler) => handler.meta.key).sort()).toEqual([KEY_A, KEY_B]);

    registry.set(atom, []);
    expect(await reactive.getHandlers()).toEqual([]);
  });
});

describe('OperationHandlerSet.keyed', () => {
  test('definitions enumerate without loading any handler body', async ({ expect }) => {
    let loads = 0;
    const set = OperationHandlerSet.keyed([
      [
        Operation.make({ input: Schema.Void, output: Schema.String, meta: { key: KEY_A } }),
        () => (loads++, Promise.resolve({ default: makeHandler(KEY_A, 'A') })),
      ],
    ]);
    expect(set.definitions!().map((definition) => definition.meta.key)).toEqual([KEY_A]);
    expect(loads).toEqual(0);
  });

  test('resolving one operation loads only that module', async ({ expect }) => {
    const loads = { a: 0, b: 0 };
    const set = OperationHandlerSet.keyed([
      [
        Operation.make({ input: Schema.Void, output: Schema.String, meta: { key: KEY_A } }),
        () => (loads.a++, Promise.resolve({ default: makeHandler(KEY_A, 'A') })),
      ],
      [
        Operation.make({ input: Schema.Void, output: Schema.String, meta: { key: KEY_B } }),
        () => (loads.b++, Promise.resolve({ default: makeHandler(KEY_B, 'B') })),
      ],
    ]);
    const found = await EffectEx.runPromise(OperationHandlerSet.getHandlerByKey(set, KEY_A));
    expect(found.meta.key).toEqual(KEY_A);
    expect(loads).toEqual({ a: 1, b: 0 });
    // Cached per key across lookups.
    await EffectEx.runPromise(OperationHandlerSet.getHandlerByKey(set, KEY_A));
    expect(loads.a).toEqual(1);
  });

  test('merge resolves from a keyed child without forcing unkeyed siblings', async ({ expect }) => {
    let forced = 0;
    const unkeyed = OperationHandlerSet.async(() => (forced++, Promise.resolve([makeHandler(KEY_B, 'B')])));
    const keyed = OperationHandlerSet.keyed([
      [
        Operation.make({ input: Schema.Void, output: Schema.String, meta: { key: KEY_A } }),
        () => Promise.resolve({ default: makeHandler(KEY_A, 'A') }),
      ],
    ]);
    const merged = OperationHandlerSet.merge(keyed, unkeyed);

    const fromKeyed = await EffectEx.runPromise(OperationHandlerSet.getHandlerByKey(merged, KEY_A));
    expect(fromKeyed.meta.key).toEqual(KEY_A);
    expect(forced).toEqual(0);

    // Unkeyed fallback still resolves (forcing only that set).
    const fromUnkeyed = await EffectEx.runPromise(OperationHandlerSet.getHandlerByKey(merged, KEY_B));
    expect(fromUnkeyed.meta.key).toEqual(KEY_B);
    expect(forced).toBeGreaterThan(0);
  });

  test('an earlier make-set override wins over a later keyed set for the same key', async ({ expect }) => {
    // A materialized `make` set answers per-key lookups directly, so resolution honors
    // contribution order — a later keyed contribution must not shadow an earlier override
    // (e.g. a story or test stubbing an operation a plugin also handles).
    const overrideHandler = makeHandler(KEY_A, 'override');
    const override = OperationHandlerSet.make(overrideHandler);
    const keyed = OperationHandlerSet.keyed([
      [
        Operation.make({ input: Schema.Void, output: Schema.String, meta: { key: KEY_A } }),
        () => Promise.resolve({ default: makeHandler(KEY_A, 'plugin') }),
      ],
    ]);
    const merged = OperationHandlerSet.merge(override, keyed);

    const found = await EffectEx.runPromise(OperationHandlerSet.getHandlerByKey(merged, KEY_A));
    expect(found).toBe(overrideHandler);
  });
});
