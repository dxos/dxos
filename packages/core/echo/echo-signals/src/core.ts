//
// Copyright 2022 DXOS.org
//

import { signal, batch } from '@preact/signals-core';

import { registerSignalRuntime as registerRuntimeForEcho } from './runtime';

let registered = false;

export const registerSignalRuntime = () => {
  if (registered) {
    return false;
  }
  registered = true;

  registerRuntimeForEcho({
    createSignal: () => {
      const thisSignal = signal({});

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
  });

  return true;
};

/**
 * @deprecated Use `registerSignalRuntime`.
 */
export const registerSignalFactory = registerSignalRuntime;
