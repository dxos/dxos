//
// Copyright 2026 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

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

describe('OperationHandlerSet.withResolver', () => {
  test('a miss consults the resolver once and retries the lookup', async ({ expect }) => {
    let handlers: Operation.WithHandler<Operation.Definition.Any>[] = [];
    let resolutions = 0;
    // `async` caches its first read; model the reactive set with a fresh view per read.
    const live: OperationHandlerSet.OperationHandlerSet = {
      [OperationHandlerSet.TypeId]: OperationHandlerSet.TypeId,
      getHandlers: () => Promise.resolve(handlers),
      handlers: Effect.suspend(() => Effect.succeed(handlers)),
    };
    const set = OperationHandlerSet.withResolver(live, async () => {
      resolutions++;
      handlers = [makeHandler(KEY_A, 'A')];
      return true;
    });

    const found = await Effect.runPromise(OperationHandlerSet.getHandlerByKey(set, KEY_A));
    expect(found.meta.key).toEqual(KEY_A);
    expect(resolutions).toEqual(1);

    // Present handlers resolve without consulting the resolver again.
    await Effect.runPromise(OperationHandlerSet.getHandlerByKey(set, KEY_A));
    expect(resolutions).toEqual(1);
  });

  test('a failed resolution is not repeated per key and the lookup fails', async ({ expect }) => {
    let resolutions = 0;
    const set = OperationHandlerSet.withResolver(OperationHandlerSet.empty, async () => {
      resolutions++;
      return true;
    });

    await expect(Effect.runPromise(OperationHandlerSet.getHandlerByKey(set, KEY_B))).rejects.toThrow();
    await expect(Effect.runPromise(OperationHandlerSet.getHandlerByKey(set, KEY_B))).rejects.toThrow();
    expect(resolutions).toEqual(1);
  });
});
