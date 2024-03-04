//
// Copyright 2022 DXOS.org
//

import { signal, batch, untracked } from '@preact/signals-react';

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
    untracked,
  });

  return true;
};

/**
 * @deprecated Use `registerSignalRuntime`.
 */
export const registerSignalFactory = registerSignalRuntime;
