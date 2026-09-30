//
// Copyright 2026 DXOS.org
//

import type * as GraphBuilder from '@dxos/graph/GraphBuilder';

export { yieldOrContinue } from '@dxos/async';
export { scheduleTask } from 'main-thread-scheduling';

/** Room left in a 60 Hz frame for layout, paint and the render the flushed updates trigger. */
const FRAME_BUDGET_MS = 5;

let spent = 0;
let resetRequested = false;
let urgent = false;

/**
 * Lets update flushes ignore the budget until the current task ends, so the result of a user action
 * reaches the screen in the frame after it rather than one frame later.
 */
export const flushBeforePaint = (): void => {
  if (urgent) {
    return;
  }
  urgent = true;
  const channel = new MessageChannel();
  channel.port1.onmessage = () => {
    urgent = false;
    channel.port1.close();
  };
  channel.port2.postMessage(null);
};

/** Resets on each animation frame; a hidden tab has none, so its updates go to the scheduler. */
export const frameBudget: GraphBuilder.FrameBudget = {
  hasTime: () => urgent || spent < FRAME_BUDGET_MS,
  spend: (ms) => {
    spent += ms;
    if (!resetRequested) {
      resetRequested = true;
      requestAnimationFrame(() => {
        spent = 0;
        resetRequested = false;
      });
    }
  },
};
