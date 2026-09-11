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
