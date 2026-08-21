//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { expect } from 'vitest';

import { SqlTransaction } from '@dxos/sql-sqlite';

import * as StateStore from './StateStore';
import type * as Type from './types';

const target = (id: string, over: Partial<Type.Target> = {}): Type.Target => ({
  id,
  channelId: id,
  depth: 0,
  status: 'pending',
  ...over,
});

const suite = (name: string, layer: Layer.Layer<StateStore.StateStore>) =>
  describe(name, () => {
    it.effect(
      'pushes targets LIFO and peeks the top actionable',
      Effect.fnUntraced(function* () {
        const store = yield* StateStore.StateStore;
        yield* store.pushTargets([target('chan-1'), target('chan-2')]);
        // LIFO: the last pushed target is on top of the frontier.
        expect((yield* store.nextActionable())?.id).toBe('chan-2');
        // Re-pushing an existing id is a no-op.
        yield* store.pushTargets([target('chan-1', { depth: 5 })]);
        const targets = yield* store.listTargets();
        expect(targets.length).toBe(2);
        expect(targets.find((entry) => entry.id === 'chan-1')?.depth).toBe(0);
      }, Effect.provide(layer)),
    );

    it.effect(
      'setCursor stamps lastRunAt and preserves lastError as a diagnostic',
      Effect.fnUntraced(function* () {
        const store = yield* StateStore.StateStore;
        yield* store.pushTargets([target('chan-1')]);
        yield* store.setStatus('chan-1', 'error', 'boom');
        yield* store.setCursor('chan-1', '1000');
        const [entry] = yield* store.listTargets();
        expect(entry.cursor).toBe('1000');
        expect(entry.lastRunAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        // The sink commits per message; a recorded fault must survive later commits.
        expect(entry.lastError).toBe('boom');
        // Status is orthogonal to the cursor write.
        expect(entry.status).toBe('error');
      }, Effect.provide(layer)),
    );

    it.effect(
      'setStatus records lastError on failure and preserves it on later status writes',
      Effect.fnUntraced(function* () {
        const store = yield* StateStore.StateStore;
        yield* store.pushTargets([target('chan-1')]);
        yield* store.setStatus('chan-1', 'active', 'stage: boom');
        yield* store.setStatus('chan-1', 'done');
        const [entry] = yield* store.listTargets();
        expect(entry.status).toBe('done');
        expect(entry.lastError).toBe('stage: boom');
      }, Effect.provide(layer)),
    );

    it.effect(
      'hasActionable reflects pending/active only',
      Effect.fnUntraced(function* () {
        const store = yield* StateStore.StateStore;
        yield* store.pushTargets([target('chan-1')]);
        expect(yield* store.hasActionable()).toBe(true);
        yield* store.setStatus('chan-1', 'done');
        expect(yield* store.hasActionable()).toBe(false);
        expect(yield* store.nextActionable()).toBeUndefined();
      }, Effect.provide(layer)),
    );

    it.effect(
      'tracks run status',
      Effect.fnUntraced(function* () {
        const store = yield* StateStore.StateStore;
        expect(yield* store.getRunStatus()).toBe('idle');
        yield* store.setRunStatus('running');
        expect(yield* store.getRunStatus()).toBe('running');
      }, Effect.provide(layer)),
    );
  });

describe('StateStore', () => {
  suite('memory', StateStore.layerMemory);
  suite(
    'sql',
    StateStore.layerSql.pipe(
      Layer.provideMerge(SqlTransaction.layer),
      Layer.provideMerge(SqliteClient.layer({ filename: ':memory:' }).pipe(Layer.orDie)),
    ),
  );

  it.effect(
    'sql state survives a fresh layer over the same database',
    Effect.fnUntraced(function* () {
      // Two StateStore layers over ONE client: the second must see the first's writes. Each
      // `Effect.provide` builds with its own memo map, so passing the same layer value twice would
      // open two `:memory:` databases -- build the client once and provide the resulting context
      // (`Layer.memoize` is gone in v4).
      const client = SqlTransaction.layer.pipe(
        Layer.provideMerge(SqliteClient.layer({ filename: ':memory:' }).pipe(Layer.orDie)),
      );
      yield* Effect.scoped(
        Effect.gen(function* () {
          const shared = yield* Layer.build(client);

          yield* Effect.gen(function* () {
            const store = yield* StateStore.StateStore;
            yield* store.pushTargets([target('chan-1')]);
            yield* store.setCursor('chan-1', '42');
          }).pipe(Effect.provide(StateStore.layerSql), Effect.provide(shared));

          yield* Effect.gen(function* () {
            const store = yield* StateStore.StateStore;
            const [entry] = yield* store.listTargets();
            expect(entry.cursor).toBe('42');
          }).pipe(Effect.provide(StateStore.layerSql), Effect.provide(shared));
        }),
      );
    }),
  );
});
