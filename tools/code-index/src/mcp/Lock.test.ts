//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Scope from 'effect/Scope';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as Store from '../Store.ts';
import * as Lock from './Lock.ts';

describe('Lock', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'code-index-lock-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  /** Opens the store in a scope the test closes itself, standing in for another process holding it. */
  const hold = Effect.gen(function* () {
    const scope = yield* Scope.make();
    yield* Layer.buildWithScope(Store.layer(dir), scope);
    return scope;
  });

  const statsVia = (layer: Layer.Layer<Store.Store, Store.StoreError>) =>
    Effect.scoped(
      Effect.provide(
        Effect.flatMap(Store.Store, (store) => store.stats()),
        layer,
      ),
    );

  test('only holders that finish on their own are waited for', ({ expect }) => {
    const holder = (command: string): Lock.Holder => ({ pid: 1, command });
    expect(Lock.isTransient(holder('bun tools/code-index/bin/code-index.ts index --root .'))).toBe(true);
    expect(Lock.isTransient(holder('code-index query "SELECT * {}"'))).toBe(true);
    expect(Lock.isTransient(holder('bun bin/code-index.ts --port 5600'))).toBe(false);
    expect(Lock.isTransient(holder('code-index serve'))).toBe(false);
    expect(Lock.isTransient(holder('code-index mcp'))).toBe(false);
    expect(Lock.isTransient(holder('code-index chat --prompt hi'))).toBe(false);
    expect(Lock.isTransient(holder('vim LOCK'))).toBe(false);
  });

  test('a lock error is recognised through the store error that wraps it', ({ expect }) => {
    const wrapped = new Store.StoreError({
      message: 'Failed to open graph: Database failed to open',
      cause: new Error('Database failed to open', {
        cause: new Error('IO error: lock /x/LOCK: Resource temporarily unavailable'),
      }),
    });
    expect(Lock.isLockError(wrapped)).toBe(true);
    expect(Lock.isLockError(new Store.StoreError({ message: 'Failed to read store version' }))).toBe(false);
  });

  test('a store still held at the deadline fails naming the directory and what to do', async () => {
    const exit = await EffectEx.runPromise(
      Effect.gen(function* () {
        const scope = yield* hold;
        const result = yield* Effect.exit(
          statsVia(Lock.layer(dir, () => Store.layer(dir), { timeout: '300 millis', interval: '50 millis' })),
        );
        yield* Scope.close(scope, Exit.void);
        return result;
      }),
    );
    expect(Exit.isFailure(exit)).toBe(true);
    const message = Exit.isFailure(exit) ? String(exit.cause) : '';
    expect(message).toContain(`The store at ${dir} is locked by another process`);
    expect(message).toContain('stop that process');
  });

  test('a store released while waiting opens', async () => {
    const stats = await EffectEx.runPromise(
      Effect.gen(function* () {
        const scope = yield* hold;
        const opening = yield* Effect.forkChild(
          statsVia(Lock.layer(dir, () => Store.layer(dir), { timeout: '10 seconds', interval: '50 millis' })),
        );
        yield* Effect.sleep('300 millis');
        yield* Scope.close(scope, Exit.void);
        return yield* Fiber.join(opening);
      }),
    );
    expect(stats.quads).toBe(0);
  });

  test('an open interrupted mid-build releases what it acquired', async () => {
    let released = false;
    const stalled = Layer.effect(
      Store.Store,
      Effect.flatMap(
        Effect.addFinalizer(() =>
          Effect.sync(() => {
            released = true;
          }),
        ),
        () => Effect.never,
      ),
    );
    await EffectEx.runPromise(
      Effect.gen(function* () {
        const opening = yield* Effect.forkChild(Effect.scoped(Layer.build(Lock.layer(dir, () => stalled))));
        yield* Effect.sleep('100 millis');
        yield* Fiber.interrupt(opening);
      }),
    );
    expect(released).toBe(true);
  });

  test('a store nobody holds opens at once', async () => {
    const stats = await EffectEx.runPromise(statsVia(Lock.layer(dir, () => Store.layer(dir))));
    expect(stats.files).toBe(0);
  });
});
