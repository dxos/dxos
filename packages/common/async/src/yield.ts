//
// Copyright 2026 DXOS.org
//

import { isNode } from '@dxos/util';

type HostScheduler = { yield?: () => Promise<void> };

/** One channel for every yield: a port per call would leave an open handle behind each one. */
let channel: MessageChannel | undefined;
const waiting: Array<() => void> = [];

const yieldViaMessageChannel = (): Promise<void> =>
  new Promise((resolve) => {
    if (!channel) {
      channel = new MessageChannel();
      channel.port1.onmessage = () => waiting.shift()?.();
    }
    waiting.push(resolve);
    channel.port2.postMessage(undefined);
  });

/**
 * Resolves in a later task so queued input and rendering get a turn between slices of a long job.
 *
 * `scheduler.yield` keeps the continuation ahead of other same-priority work where the host has it.
 * A message task is the browser fallback because timers are clamped in a hidden tab, which would
 * stall a background sync; Node drains message ports without visiting its timers, so it gets the
 * timer instead.
 */
export const yieldToEventLoop = (): Promise<void> => {
  const scheduler = (globalThis as { scheduler?: HostScheduler }).scheduler;
  if (scheduler?.yield) {
    return scheduler.yield();
  }
  if (!isNode() && typeof MessageChannel !== 'undefined') {
    return yieldViaMessageChannel();
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
};

/**
 * How eagerly {@link yieldOrContinue} gives the event loop a turn, named after `main-thread-scheduling`'s strategies:
 * the work keeps the page `interactive`, `smooth` or `idle`.
 */
export type YieldStrategy = 'interactive' | 'smooth' | 'idle';

const SLICE_BUDGET_MS: Record<YieldStrategy, number> = { interactive: 83, smooth: 13, idle: 5 };

let sliceUntilNextTurn: { start: number } | undefined;

const openSliceUntilNextTurn = (): { start: number } => {
  if (!sliceUntilNextTurn) {
    const started = { start: performance.now() };
    sliceUntilNextTurn = started;
    void yieldToEventLoop().then(() => {
      if (sliceUntilNextTurn === started) {
        sliceUntilNextTurn = undefined;
      }
    });
  }
  return sliceUntilNextTurn;
};

/** Whether the current slice has used its strategy's budget, for callers that yield by other means. */
export const shouldYield = (strategy: YieldStrategy): boolean =>
  performance.now() - openSliceUntilNextTurn().start >= SLICE_BUDGET_MS[strategy];

/** Yields to the event loop once the current slice has used its strategy's budget, and resolves at once otherwise. */
export const yieldOrContinue = async (strategy: YieldStrategy): Promise<void> => {
  if (!shouldYield(strategy)) {
    return;
  }
  await yieldToEventLoop();
};
