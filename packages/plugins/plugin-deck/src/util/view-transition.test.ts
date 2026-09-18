//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { withViewTransition } from './view-transition.ts';

type UpdateCallback = () => Promise<void>;

type FakeTransition = {
  /** The update callbacks `startViewTransition` received. */
  callbacks: UpdateCallback[];
  /** The one callback a transition received. */
  callback: () => UpdateCallback;
};

/** Stand in for a visible document whose `startViewTransition` records its callbacks without running them. */
const installDocument = (options: { reducedMotion?: boolean; visibility?: DocumentVisibilityState } = {}) => {
  const fake: FakeTransition = {
    callbacks: [],
    callback: () => {
      const [callback] = fake.callbacks;
      if (!callback || fake.callbacks.length !== 1) {
        throw new Error(`expected one update callback, got ${fake.callbacks.length}`);
      }
      return callback;
    },
  };
  vi.stubGlobal('document', {
    visibilityState: options.visibility ?? 'visible',
    startViewTransition: (callback: UpdateCallback) => {
      fake.callbacks.push(callback);
      return {};
    },
  });
  vi.stubGlobal('window', {
    matchMedia: () => ({ matches: options.reducedMotion ?? false }),
  });
  return fake;
};

/** Let every queued microtask run. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('withViewTransition', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('runs the effect directly when the document cannot animate', async () => {
    vi.stubGlobal('document', undefined);
    const result = await EffectEx.runPromise(withViewTransition(Effect.succeed('ran')));
    expect(result).toBe('ran');
  });

  test('runs the effect directly under reduced motion', async () => {
    const fake = installDocument({ reducedMotion: true });
    const result = await EffectEx.runPromise(withViewTransition(Effect.succeed('ran')));
    expect(result).toBe('ran');
    expect(fake.callbacks).toHaveLength(0);
  });

  test('runs the effect directly in a hidden document', async () => {
    const fake = installDocument({ visibility: 'hidden' });
    await EffectEx.runPromise(withViewTransition(Effect.void));
    expect(fake.callbacks).toHaveLength(0);
  });

  test('runs the effect after the old state is captured and settles the callback after the effect', async () => {
    const fake = installDocument();
    const ran = vi.fn();
    let callbackSettled = false;
    const running = EffectEx.runPromise(withViewTransition(Effect.sync(() => ran(callbackSettled))));
    await flush();
    const callback = fake.callback();
    expect(ran).not.toHaveBeenCalled();

    const done = callback().then(() => {
      callbackSettled = true;
    });
    await running;
    // The effect saw the callback still pending, so the new state is captured after the effect's writes.
    expect(ran).toHaveBeenCalledOnce();
    expect(ran).toHaveBeenCalledWith(false);
    await done;
    expect(callbackSettled).toBe(true);
  });

  test('settles the callback when the effect fails and still fails the caller', async () => {
    const fake = installDocument();
    const running = Effect.runPromiseExit(withViewTransition(Effect.fail('boom')));
    await flush();
    const done = fake.callback()();
    const exit = await running;
    expect(Exit.isFailure(exit)).toBe(true);
    await expect(done).resolves.toBeUndefined();
  });
});
