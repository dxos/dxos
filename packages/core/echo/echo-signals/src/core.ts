//
// Copyright 2022 DXOS.org
//

import { signal, batch, untracked } from '@preact/signals-core';

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
