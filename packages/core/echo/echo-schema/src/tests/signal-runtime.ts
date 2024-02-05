//
// Copyright 2024 DXOS.org
//

import { signal, batch } from '@preact/signals-core';

import { registerSignalRuntime } from '../util';

// TODO(dmaretskyi): Refactor, extract to echo-signals.
const registered = false;

/**
 * Only for testing
 */
export const registerPreactSignals = () => {
  if (registered) {
    return false;
  }

  registerSignalRuntime({
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
