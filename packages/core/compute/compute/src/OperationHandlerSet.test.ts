//
// Copyright 2026 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as Operation from './Operation';
import * as OperationHandlerSet from './OperationHandlerSet';

const makeHandler = (key: string, output: string) =>
  Operation.withHandler(Operation.make({ input: Schema.Void, output: Schema.String, meta: { key } }), () =>
    Effect.succeed(output),
  );

describe('OperationHandlerSet.reactive', () => {
  test('merges handlers from contributed sets', async ({ expect }) => {
    const registry = Registry.make();
    const setA = OperationHandlerSet.make(makeHandler('a', 'A'));
    const setB = OperationHandlerSet.make(makeHandler('b', 'B'));
    const atom = Atom.make<readonly OperationHandlerSet.OperationHandlerSet[]>([setA, setB]).pipe(Atom.keepAlive);
    registry.mount(atom);

    const reactive = OperationHandlerSet.reactive(registry, atom);
    const handlers = await reactive.getHandlers();
    expect(handlers.map((handler) => handler.meta.key).sort()).toEqual(['a', 'b']);
  });

  test('caches the merged result across calls', async ({ expect }) => {
    const registry = Registry.make();
    let resolveCount = 0;
    const trackingSet: OperationHandlerSet.OperationHandlerSet = {
      [OperationHandlerSet.TypeId]: OperationHandlerSet.TypeId,
      getHandlers: () => {
        resolveCount++;
        return Promise.resolve([makeHandler('a', 'A')]);
      },
      handlers: Effect.sync(() => {
        resolveCount++;
        return [makeHandler('a', 'A')];
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

  test('invalidates and re-resolves when the atom changes', async ({ expect }) => {
    const registry = Registry.make();
    const setA = OperationHandlerSet.make(makeHandler('a', 'A'));
    const setB = OperationHandlerSet.make(makeHandler('b', 'B'));
    const atom = Atom.make<readonly OperationHandlerSet.OperationHandlerSet[]>([setA]).pipe(Atom.keepAlive);
    registry.mount(atom);

    const reactive = OperationHandlerSet.reactive(registry, atom);
    expect((await reactive.getHandlers()).map((handler) => handler.meta.key)).toEqual(['a']);

    registry.set(atom, [setA, setB]);
    expect((await reactive.getHandlers()).map((handler) => handler.meta.key).sort()).toEqual(['a', 'b']);

    registry.set(atom, []);
    expect(await reactive.getHandlers()).toEqual([]);
  });

});
