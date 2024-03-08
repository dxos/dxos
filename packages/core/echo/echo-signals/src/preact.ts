//
// Copyright 2023 DXOS.org
//

import { signal, batch, untracked } from '@preact/signals';

import { registerSignalRuntime as registerRuntimeForEcho } from './runtime';

let registered = false;

export const registerSignalRuntime = () => {
  if (registered) {
    return false;
  }
  registered = true;

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
};

/**
 * @deprecated Use `registerSignalRuntime`.
 */
export const registerSignalFactory = registerSignalRuntime;
