//
// Copyright 2026 DXOS.org
//

import * as Scheduler from 'effect/Scheduler';

/** How long a task may run continuations as microtasks before the next one waits for a fresh task. */
const BUDGET_MS = 4;

/** A fresh task: `setImmediate` where the runtime has it (Node), else a message, which browsers do not clamp. */
const nextTask: (task: () => void) => void =
  typeof globalThis.setImmediate === 'function'
    ? (task) => globalThis.setImmediate(task)
    : (() => {
        let channel: MessageChannel | undefined;
        const queued: (() => void)[] = [];
        return (task) => {
          if (!channel) {
            channel = new MessageChannel();
            channel.port1.onmessage = () => queued.shift()?.();
          }
          queued.push(task);
          channel.port2.postMessage(null);
        };
      })();

let taskStart = 0;
let timing = false;

const promptSetImmediate = (task: () => void): (() => void) => {
  if (!timing) {
    timing = true;
    taskStart = performance.now();
    // Fires in a later task, which starts a new budget; firing late only ends this one sooner.
    setTimeout(() => {
      timing = false;
    }, 0);
  }
  let cancelled = false;
  const run = () => {
    if (!cancelled) {
      task();
    }
  };
  if (performance.now() - taskStart < BUDGET_MS) {
    queueMicrotask(run);
  } else {
    nextTask(run);
  }
  return () => {
    cancelled = true;
  };
};

/**
 * Continues a fiber in a microtask while the current task is young, and in a fresh task after that. Effect's default
 * continues in `setTimeout(0)`, which browsers clamp and queue behind every pending task, so an operation a click
 * invokes would otherwise wait behind the render that click started.
 */
export const promptScheduler: Scheduler.Scheduler = new Scheduler.MixedScheduler('async', promptSetImmediate);
