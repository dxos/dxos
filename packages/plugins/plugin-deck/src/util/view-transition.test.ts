//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { withViewTransition } from './view-transition.ts';

type UpdateCallback = () => Promise<void>;

type FakeDocument = {
  callbacks: UpdateCallback[];
  callback: () => UpdateCallback;
};

describe('withViewTransition', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test.each([
    ['the API is missing', { api: false }],
    ['the document is hidden', { visibility: 'hidden' as const }],
    ['the reader prefers reduced motion', { reducedMotion: true }],
  ])('runs the effect without a transition when %s', async (_, options) => {
    const fake = installDocument(options);
    const result = await EffectEx.runPromise(withViewTransition(Effect.succeed('ran')));
    expect(result).toBe('ran');
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

  test('settles the callback when interrupted before the old state is captured', async () => {
    const fake = installDocument();
    const ran = vi.fn();
    const fiber = Effect.runFork(withViewTransition(Effect.sync(() => ran())));
    await flush();
    const callback = fake.callback();
    await EffectEx.runPromise(Fiber.interrupt(fiber));
    expect(ran).not.toHaveBeenCalled();
    await expect(callback()).resolves.toBeUndefined();
  });
});

const installDocument = (
  options: { api?: boolean; reducedMotion?: boolean; visibility?: DocumentVisibilityState } = {},
): FakeDocument => {
  const fake: FakeDocument = {
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
    ...(options.api !== false && {
      startViewTransition: ({ update }: { update: UpdateCallback }) => {
        fake.callbacks.push(update);
        return {};
      },
    }),
  });
  vi.stubGlobal('window', {
    matchMedia: () => ({ matches: options.reducedMotion ?? false }),
  });
  return fake;
};

const flush = () => new Promise<void>((resolve) => setTimeout(resolve));
