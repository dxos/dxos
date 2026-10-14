//
// Copyright 2026 DXOS.org
//

import type { FrameBudget } from './scheduler.ts';

export { yieldOrContinue } from '@dxos/async';
export { scheduleTask } from 'main-thread-scheduling';

/** Room left in a 60 Hz frame for layout, paint and the render the flushed updates trigger. */
const FRAME_BUDGET_MS = 5;

/** Resets on each animation frame; a hidden tab has none, so its updates go to the scheduler. */
class BrowserFrameBudget implements FrameBudget {
  #spent = 0;
  #resetRequested = false;
  #urgent = false;

  hasTime(): boolean {
    return this.#urgent || this.#spent < FRAME_BUDGET_MS;
  }

  spend(ms: number): void {
    this.#spent += ms;
    if (!this.#resetRequested) {
      this.#resetRequested = true;
      requestAnimationFrame(() => {
        this.#spent = 0;
        this.#resetRequested = false;
      });
    }
  }

  /** The result of a user action reaches the screen in the frame after it rather than one frame later. */
  flushBeforePaint(): void {
    if (this.#urgent) {
      return;
    }
    this.#urgent = true;
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      this.#urgent = false;
      channel.port1.close();
    };
    channel.port2.postMessage(null);
  }
}

export const makeFrameBudget = (): FrameBudget => new BrowserFrameBudget();
