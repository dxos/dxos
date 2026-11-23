//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { transitionWhenRendered } from './transition.ts';

describe('transitionWhenRendered', () => {
  let leaving: HTMLElement;
  let entering: HTMLElement;
  let fades: { at: number; cancelled: boolean; finish: () => void }[];
  let done: number;
  const onDone = () => {
    done++;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    leaving = document.createElement('div');
    entering = document.createElement('div');
    document.body.append(leaving, entering);
    fades = [];
    done = 0;
    // happy-dom has no animations: record each one, and let the test finish it.
    Object.defineProperty(leaving, 'animate', {
      value: () => {
        const { promise, resolve, reject } = Promise.withResolvers<void>();
        const fade = { at: Date.now(), cancelled: false, finish: () => resolve() };
        fades.push(fade);
        return {
          finished: promise,
          // As in browsers, a cancelled animation's `finished` rejects.
          cancel: () => {
            fade.cancelled = true;
            reject(new DOMException('cancelled', 'AbortError'));
          },
        };
      },
    });
  });

  afterEach(() => {
    leaving.remove();
    entering.remove();
    vi.useRealTimers();
  });

  // Each change of the entered DOM restarts the quiet window.
  const changeEntering = async () => {
    entering.append(document.createElement('span'));
    await vi.advanceTimersByTimeAsync(0);
  };

  test('fades out once the entered DOM goes quiet, and reports when it is gone', async () => {
    const start = Date.now();
    transitionWhenRendered(leaving, entering, onDone, { quietMs: 80 });
    await changeEntering();
    await vi.advanceTimersByTimeAsync(60);
    await changeEntering();
    await vi.advanceTimersByTimeAsync(60);
    expect(fades).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(60);
    expect(fades).toHaveLength(1);
    expect(fades[0].at - start).toBeGreaterThanOrEqual(140);
    expect(done).toBe(0);
    fades[0].finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(1);
  });

  test('fades out once the quiet window passes when the entered DOM has already rendered', async () => {
    transitionWhenRendered(leaving, entering, onDone, { quietMs: 80, maxHoldMs: 700 });
    await vi.advanceTimersByTimeAsync(100);
    expect(fades).toHaveLength(1);
  });

  test('fades out after the hold limit while the entered DOM keeps changing', async () => {
    transitionWhenRendered(leaving, entering, onDone, { quietMs: 80, maxHoldMs: 300 });
    for (let i = 0; i < 8; i++) {
      await changeEntering();
      await vi.advanceTimersByTimeAsync(50);
    }
    expect(fades).toHaveLength(1);
  });

  test('cancelling stops the fade, before it starts or while it runs', async () => {
    const cancelEarly = transitionWhenRendered(leaving, entering, onDone, { quietMs: 80 });
    await changeEntering();
    cancelEarly();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(fades).toHaveLength(0);

    const cancelLate = transitionWhenRendered(leaving, entering, onDone, { quietMs: 80 });
    await vi.advanceTimersByTimeAsync(1_000);
    cancelLate();
    await vi.advanceTimersByTimeAsync(0);
    expect(fades[0].cancelled).toBe(true);
    expect(done).toBe(0);
  });
});
