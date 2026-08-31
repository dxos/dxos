//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';

import * as Operation from './Operation';
import * as OperationHandlerSet from './OperationHandlerSet';

const KEY_A = DXN.make('com.example.test.a');
const KEY_B = DXN.make('com.example.test.b');

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
      definitions: () => [],
      getHandlerFor: () => Promise.resolve(undefined),
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
      definitions: () => [],
      getHandlerFor: () => Promise.resolve(undefined),
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

describe('OperationHandlerSet.lazy', () => {
  test('definitions enumerate without loading any handler body', async ({ expect }) => {
    let loads = 0;
    const set = OperationHandlerSet.lazy([
      Operation.make({ input: Schema.Void, output: Schema.String, meta: { key: KEY_A } }).pipe(
        Operation.lazyHandler(() => (loads++, Promise.resolve({ default: makeHandler(KEY_A, 'A') }))),
      ),
    ]);
    expect(set.definitions().map((definition) => definition.meta.key)).toEqual([KEY_A]);
    expect(loads).toEqual(0);
  });

  test('resolving one operation loads only that module', async ({ expect }) => {
    const loads = { a: 0, b: 0 };
    const set = OperationHandlerSet.lazy([
      Operation.make({ input: Schema.Void, output: Schema.String, meta: { key: KEY_A } }).pipe(
        Operation.lazyHandler(() => (loads.a++, Promise.resolve({ default: makeHandler(KEY_A, 'A') }))),
      ),
      Operation.make({ input: Schema.Void, output: Schema.String, meta: { key: KEY_B } }).pipe(
        Operation.lazyHandler(() => (loads.b++, Promise.resolve({ default: makeHandler(KEY_B, 'B') }))),
      ),
    ]);
    const found = await EffectEx.runPromise(OperationHandlerSet.getHandlerByKey(set, KEY_A));
    expect(found.meta.key).toEqual(KEY_A);
    expect(loads).toEqual({ a: 1, b: 0 });
    // Cached per key across lookups.
    await EffectEx.runPromise(OperationHandlerSet.getHandlerByKey(set, KEY_A));
    expect(loads.a).toEqual(1);
  });

  test('a failed load is not memoized, so a retry re-imports', async ({ expect }) => {
    let loads = 0;
    const set = OperationHandlerSet.lazy([
      Operation.make({ input: Schema.Void, output: Schema.String, meta: { key: KEY_A } }).pipe(
        Operation.lazyHandler(() => {
          loads++;
          return loads === 1
            ? Promise.reject(new TypeError('Failed to fetch dynamically imported module'))
            : Promise.resolve({ default: makeHandler(KEY_A, 'A') });
        }),
      ),
    ]);
    await expect(set.getHandlerFor(KEY_A)).rejects.toThrow('Failed to fetch dynamically imported module');
    const found = await set.getHandlerFor(KEY_A);
    expect(found?.meta.key).toEqual(KEY_A);
    expect(loads).toEqual(2);
    // The successful load is still cached.
    await set.getHandlerFor(KEY_A);
    expect(loads).toEqual(2);
  });

  test('merge loads only the matched child', async ({ expect }) => {
    const loads = { a: 0, b: 0 };
    const setA = OperationHandlerSet.lazy([
      Operation.make({ input: Schema.Void, output: Schema.String, meta: { key: KEY_A } }).pipe(
        Operation.lazyHandler(() => (loads.a++, Promise.resolve({ default: makeHandler(KEY_A, 'A') }))),
      ),
    ]);
    const setB = OperationHandlerSet.lazy([
      Operation.make({ input: Schema.Void, output: Schema.String, meta: { key: KEY_B } }).pipe(
        Operation.lazyHandler(() => (loads.b++, Promise.resolve({ default: makeHandler(KEY_B, 'B') }))),
      ),
    ]);
    const merged = OperationHandlerSet.merge(setA, setB);

    const fromA = await EffectEx.runPromise(OperationHandlerSet.getHandlerByKey(merged, KEY_A));
    expect(fromA.meta.key).toEqual(KEY_A);
    expect(loads).toEqual({ a: 1, b: 0 });

    const fromB = await EffectEx.runPromise(OperationHandlerSet.getHandlerByKey(merged, KEY_B));
    expect(fromB.meta.key).toEqual(KEY_B);
    expect(loads).toEqual({ a: 1, b: 1 });
  });

  test('merge enumerates definitions without loading any handler', async ({ expect }) => {
    let loaded = 0;
    const set = OperationHandlerSet.merge(
      OperationHandlerSet.lazy([
        Operation.make({ input: Schema.Void, output: Schema.String, meta: { key: KEY_A } }).pipe(
          Operation.lazyHandler(() => (loaded++, Promise.resolve({ default: makeHandler(KEY_A, 'A') }))),
        ),
      ]),
      OperationHandlerSet.make(makeHandler(KEY_B, 'B')),
    );

    expect(
      set
        .definitions()
        .map((definition) => definition.meta.key)
        .sort(),
    ).toEqual([KEY_A, KEY_B]);
    expect(loaded).toEqual(0);
  });

  test('an earlier make-set override wins over a later lazy set for the same key', async ({ expect }) => {
    // A materialized `make` set answers per-key lookups directly, so resolution honors
    // contribution order — a later lazy contribution must not shadow an earlier override
    // (e.g. a story or test stubbing an operation a plugin also handles).
    const overrideHandler = makeHandler(KEY_A, 'override');
    const override = OperationHandlerSet.make(overrideHandler);
    const lazySet = OperationHandlerSet.lazy([
      Operation.make({ input: Schema.Void, output: Schema.String, meta: { key: KEY_A } }).pipe(
        Operation.lazyHandler(() => Promise.resolve({ default: makeHandler(KEY_A, 'plugin') })),
      ),
    ]);
    const merged = OperationHandlerSet.merge(override, lazySet);

    const found = await EffectEx.runPromise(OperationHandlerSet.getHandlerByKey(merged, KEY_A));
    expect(found).toBe(overrideHandler);
  });
});

// React's `use` dedupes suspended renders by thenable identity, so the reactive set — what
// useOperationHandler resolves against — must return the SAME promise for repeated same-key calls.
describe('OperationHandlerSet.reactive getHandlerFor identity', () => {
  test('returns a stable promise until the atom changes', async ({ expect }) => {
    const registry = Registry.make();
    const atom = Atom.make<readonly OperationHandlerSet.OperationHandlerSet[]>([
      OperationHandlerSet.make(makeHandler(KEY_A, 'A')),
    ]).pipe(Atom.keepAlive);
    registry.mount(atom);

    const reactive = OperationHandlerSet.reactive(registry, atom);
    const before = reactive.getHandlerFor(KEY_B);
    expect(reactive.getHandlerFor(KEY_B)).toBe(before);
    expect(await before).toBeUndefined();

    registry.set(atom, [
      OperationHandlerSet.make(makeHandler(KEY_A, 'A')),
      OperationHandlerSet.make(makeHandler(KEY_B, 'B')),
    ]);
    const after = reactive.getHandlerFor(KEY_B);
    expect(after).not.toBe(before);
    expect((await after)?.meta.key).toEqual(KEY_B);
  });

  test('a rejection after invalidation does not evict the replacement promise', async ({ expect }) => {
    const registry = Registry.make();
    let rejectFirst!: (err: Error) => void;
    const pendingChild: OperationHandlerSet.OperationHandlerSet = {
      [OperationHandlerSet.TypeId]: OperationHandlerSet.TypeId,
      definitions: () => [],
      getHandlerFor: () => new Promise((_, reject) => (rejectFirst = reject)),
      getHandlers: () => Promise.resolve([]),
      handlers: Effect.succeed([]),
    };
    const atom = Atom.make<readonly OperationHandlerSet.OperationHandlerSet[]>([pendingChild]).pipe(Atom.keepAlive);
    registry.mount(atom);

    const reactive = OperationHandlerSet.reactive(registry, atom);
    const first = reactive.getHandlerFor(KEY_A);
    // Invalidate while the first lookup is in flight, then memoize a replacement.
    registry.set(atom, [OperationHandlerSet.make(makeHandler(KEY_A, 'A'))]);
    const replacement = reactive.getHandlerFor(KEY_A);
    rejectFirst(new Error('late'));
    await expect(first).rejects.toThrow('late');
    expect(reactive.getHandlerFor(KEY_A)).toBe(replacement);
  });

  test('a rejection is not memoized', async ({ expect }) => {
    const registry = Registry.make();
    let calls = 0;
    const flakyChild: OperationHandlerSet.OperationHandlerSet = {
      [OperationHandlerSet.TypeId]: OperationHandlerSet.TypeId,
      definitions: () => [],
      getHandlerFor: () => {
        calls++;
        return calls === 1 ? Promise.reject(new Error('transient')) : Promise.resolve(makeHandler(KEY_A, 'A'));
      },
      getHandlers: () => Promise.resolve([]),
      handlers: Effect.succeed([]),
    };
    const atom = Atom.make<readonly OperationHandlerSet.OperationHandlerSet[]>([flakyChild]).pipe(Atom.keepAlive);
    registry.mount(atom);

    const reactive = OperationHandlerSet.reactive(registry, atom);
    await expect(reactive.getHandlerFor(KEY_A)).rejects.toThrow('transient');
    expect((await reactive.getHandlerFor(KEY_A))?.meta.key).toEqual(KEY_A);
  });
});
