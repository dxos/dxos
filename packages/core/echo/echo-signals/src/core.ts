//
// Copyright 2022 DXOS.org
//

import { batch, effect, signal, untracked } from '@preact/signals-core';

import { registerSignalsRuntime as registerRuntimeForEcho } from './runtime';

let registered = false;

/**
 * Idempotent function that registers preact signals for module.
 */
export const registerSignalsRuntime = () => {
  if (registered) {
    return false;
  }

  registerRuntimeForEcho({
    createSignal: (debugInfo) => {
      const thisSignal = signal({});
      (thisSignal as any).__debugInfo = debugInfo;
      return {
        notifyRead: () => {
          const _ = thisSignal.value;
        },
        notifyWrite: () => {
          thisSignal.value = {};
        },
      };
    },
    batch,
    untracked,
  });

  registered = true;
  return true;
};

/**
 * Subscribes to data and executes the effect in a timeout.
 * Allows effects to be scheduled after the current render cycle.
 */
export const scheduledEffect = <T extends Record<string, any> = Record<string, any>>(
  subscribeTo: () => T,
  exec: (data: T) => void,
) =>
  effect(() => {
    const data = subscribeTo();
    setTimeout(() => exec(data));
  });
