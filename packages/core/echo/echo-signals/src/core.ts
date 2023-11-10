//
// Copyright 2022 DXOS.org
//

import { signal, batch } from '@preact/signals-core';

import { registerSignalRuntime as registerRuntimeForEcho } from '@dxos/echo-schema';

const registered = false;

export const registerSignalRuntime = () => {
  if (registered) {
    return false;
  }

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
