//
// Copyright 2023 DXOS.org
//

import { signal, batch } from '@preact/signals';

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
};

/**
 * @deprecated Use `registerSignalRuntime`.
 */
export const registerSignalFactory = registerSignalRuntime;
