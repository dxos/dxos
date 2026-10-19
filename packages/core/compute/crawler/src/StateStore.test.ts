//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { afterEach, beforeEach, expect } from 'vitest';

import { Filter, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';

import * as CrawlState from './CrawlState.ts';
import * as StateStore from './StateStore.ts';
import type * as Type from './types.ts';

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
      'resetTargets rewinds the named targets, or all of them',
      Effect.fnUntraced(function* () {
        const store = yield* StateStore.StateStore;
        yield* store.pushTargets([target('chan-1'), target('chan-2'), target('chan-3')]);
        for (const id of ['chan-1', 'chan-2', 'chan-3']) {
          yield* store.setCursor(id, '1000');
          yield* store.setStatus(id, 'error', 'boom');
        }
        yield* store.resetTargets(['chan-1']);
        const reset = (yield* store.listTargets()).find((entry) => entry.id === 'chan-1');
        expect(reset).toEqual(target('chan-1'));
        expect((yield* store.listTargets()).find((entry) => entry.id === 'chan-2')?.cursor).toBe('1000');
        yield* store.resetTargets();
        expect(yield* store.listTargets()).toEqual([target('chan-1'), target('chan-2'), target('chan-3')]);
      }, Effect.provide(layer)),
    );

    it.effect(
      'removeTargets drops targets, and a later push adds them afresh',
      Effect.fnUntraced(function* () {
        const store = yield* StateStore.StateStore;
        yield* store.pushTargets([target('chan-1'), target('chan-2')]);
        yield* store.setCursor('chan-1', '1000');
        yield* store.removeTargets(['chan-1']);
        expect((yield* store.listTargets()).map((entry) => entry.id)).toEqual(['chan-2']);
        yield* store.pushTargets([target('chan-1')]);
        expect((yield* store.listTargets()).find((entry) => entry.id === 'chan-1')).toEqual(target('chan-1'));
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
  // A fresh object per test, as the other suites get a fresh store.
  suite('echo', Layer.unwrap(Effect.sync(() => StateStore.layerEcho(CrawlState.make()))));
  suite(
    'sql',
    StateStore.layerSql.pipe(Layer.provideMerge(SqliteClient.layer({ filename: ':memory:' }).pipe(Layer.orDie))),
  );

  it.effect(
    'sql state survives a fresh layer over the same database',
    Effect.fnUntraced(function* () {
      // Two StateStore layers over ONE client: the second must see the first's writes. Each
      // `Effect.provide` builds with its own memo map, so passing the same layer value twice would
      // open two `:memory:` databases -- build the client once and provide the resulting context
      // (`Layer.memoize` is gone in v4).
      const client = SqliteClient.layer({ filename: ':memory:' }).pipe(Layer.orDie);
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

  describe('echo database', () => {
    let builder: EchoTestBuilder;

    beforeEach(async () => {
      builder = await new EchoTestBuilder().open();
    });

    afterEach(async () => {
      await builder.close();
    });

    it.effect(
      'a stored crawl state is the frontier of a later store over the same object',
      Effect.fnUntraced(function* () {
        const peer = yield* Effect.promise(() => builder.createPeer({ types: [CrawlState.CrawlState] }));
        const db = yield* Effect.promise(() => peer.createDatabase());
        const state = db.add(CrawlState.make({ name: 'crawl' }));

        yield* Effect.gen(function* () {
          const store = yield* StateStore.StateStore;
          yield* store.pushTargets([target('chan-1'), target('chan-2'), target('chan-3')]);
          yield* store.setCursor('chan-1', '42');
          yield* store.setStatus('chan-2', 'error', 'boom');
          yield* store.removeTargets(['chan-3']);
          yield* store.resetTargets(['chan-2']);
        }).pipe(Effect.provide(StateStore.layerEcho(state)));
        yield* Effect.promise(() => db.flush());

        const [loaded] = yield* Effect.promise(() => db.query(Filter.type(CrawlState.CrawlState)).run());
        const targets = yield* StateStore.listTargets().pipe(Effect.provide(StateStore.layerEcho(loaded)));
        expect(targets.map(({ id }) => id)).toEqual(['chan-1', 'chan-2']);
        expect(targets[0].cursor).toBe('42');
        expect(targets[1]).toEqual(target('chan-2'));
      }),
    );

    it('reconcileChannels drops removed channels with their threads, adds new ones and reopens finished ones', ({
      expect,
    }) => {
      const state = CrawlState.make();
      Obj.update(state, (state) => {
        CrawlState.pushTargets(state, [
          target('chan-1'),
          target('chan-2'),
          target('thread-1', { depth: 1, rootId: 'chan-1' }),
          target('thread-2', { depth: 1, rootId: 'chan-2' }),
        ]);
        CrawlState.setStatus(state, 'chan-1', 'done');
        CrawlState.setCursor(state, 'chan-1', '7', '2026-01-01T00:00:00.000Z');
        CrawlState.setStatus(state, 'thread-1', 'done');
      });
      Obj.update(state, (state) => CrawlState.reconcileChannels(state, ['chan-1', 'chan-3']));
      expect(CrawlState.listTargets(state)).toEqual([
        { ...target('chan-1'), cursor: '7', lastRunAt: '2026-01-01T00:00:00.000Z' },
        target('thread-1', { depth: 1, rootId: 'chan-1', status: 'done' }),
        target('chan-3'),
      ]);
    });

    it('keeps source hashes across a reset', ({ expect }) => {
      const state = CrawlState.make();
      Obj.update(state, (state) => {
        CrawlState.pushTargets(state, [target('chan-1')]);
        CrawlState.setSourceHash(state, 'discord:1', 'abc');
      });
      Obj.update(state, (state) => CrawlState.resetTargets(state));
      expect(CrawlState.sourceHash(state, 'discord:1')).toBe('abc');
      Obj.update(state, (state) => CrawlState.clearSourceHashes(state));
      expect(CrawlState.sourceHash(state, 'discord:1')).toBeUndefined();
    });
  });
});
