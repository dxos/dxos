//
// Copyright 2023 DXOS.org
//

import { batch, signal, untracked } from '@preact/signals';

import { registerSignalsRuntime as registerRuntimeForEcho } from './runtime';

let registered = false;

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
