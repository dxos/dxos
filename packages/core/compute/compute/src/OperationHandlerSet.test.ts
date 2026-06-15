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
