//
// Copyright 2026 DXOS.org
//

import { act, cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { Deferred } from './Deferred.tsx';

describe('Deferred', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  test('renders children when not pending', () => {
    render(
      <Deferred pending={false} fallback={fallback}>
        {content}
      </Deferred>,
    );
    expect(screen.queryByTestId(CONTENT)).not.toBeNull();
    expect(screen.queryByTestId(FALLBACK)).toBeNull();
  });

  // The flicker guard: a surface passes through a legitimately-empty state on the way to its first
  // results, and showing the fallback for those few frames reads as the real answer.
  test('a pending state shorter than `delay` never shows the fallback', async () => {
    const { rerender } = render(
      <Deferred pending delay={1_000} fallback={fallback}>
        {content}
      </Deferred>,
    );
    expect(screen.queryByTestId(FALLBACK)).toBeNull();

    await advance(200);
    rerender(
      <Deferred pending={false} delay={1_000} fallback={fallback}>
        {content}
      </Deferred>,
    );
    await advance(2_000);

    expect(screen.queryByTestId(FALLBACK)).toBeNull();
    expect(screen.queryByTestId(CONTENT)).not.toBeNull();
  });

  test('a pending state longer than `delay` shows the fallback', async () => {
    render(
      <Deferred pending delay={1_000} fallback={fallback}>
        {content}
      </Deferred>,
    );
    await advance(1_100);
    expect(screen.queryByTestId(FALLBACK)).not.toBeNull();
  });

  test('`delay` of 0 shows the fallback immediately', () => {
    render(
      <Deferred pending delay={0} fallback={fallback}>
        {content}
      </Deferred>,
    );
    expect(screen.queryByTestId(FALLBACK)).not.toBeNull();
  });

  // The defaults carry the policy, so a consumer opting into the guard passes neither bound.
  test('defers by default, with no bounds given', async () => {
    render(
      <Deferred pending fallback={fallback}>
        {content}
      </Deferred>,
    );
    expect(screen.queryByTestId(FALLBACK)).toBeNull();

    await advance(1_100);
    expect(screen.queryByTestId(FALLBACK)).not.toBeNull();
  });

  // The opposite guard: content arriving just after the fallback committed would otherwise produce
  // the same flash by the other route.
  test('`minDuration` holds a fallback that has already rendered', async () => {
    const { rerender } = render(
      <Deferred pending delay={0} minDuration={1_000} fallback={fallback}>
        {content}
      </Deferred>,
    );
    expect(screen.queryByTestId(FALLBACK)).not.toBeNull();

    rerender(
      <Deferred pending={false} delay={0} minDuration={1_000} fallback={fallback}>
        {content}
      </Deferred>,
    );
    await advance(300);
    expect(screen.queryByTestId(FALLBACK)).not.toBeNull();

    await advance(900);
    expect(screen.queryByTestId(CONTENT)).not.toBeNull();
    expect(screen.queryByTestId(FALLBACK)).toBeNull();
  });

  // `minDuration` counts from the render, not from when `pending` flipped — a fallback still held
  // back by `delay` has not been on screen at all, so it owes no minimum.
  test('`minDuration` does not delay content when the fallback never showed', async () => {
    const { rerender } = render(
      <Deferred pending delay={1_000} minDuration={5_000} fallback={fallback}>
        {content}
      </Deferred>,
    );
    rerender(
      <Deferred pending={false} delay={1_000} minDuration={5_000} fallback={fallback}>
        {content}
      </Deferred>,
    );
    await advance(50);
    expect(screen.queryByTestId(CONTENT)).not.toBeNull();
  });

  test('the fallback thunk is not called while content is shown', () => {
    const spy = vi.fn(fallback);
    render(
      <Deferred pending={false} fallback={spy}>
        {content}
      </Deferred>,
    );
    expect(spy).not.toHaveBeenCalled();
  });
});

const CONTENT = 'content';
const FALLBACK = 'fallback';

const content = <div data-testid={CONTENT} />;
const fallback = () => <div data-testid={FALLBACK} />;

/**
 * Advances fake timers inside `act`, so the state update the timer schedules is flushed before the
 * next assertion — a bare `advanceTimersByTimeAsync` fires the callback but leaves React unrendered.
 */
const advance = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};
