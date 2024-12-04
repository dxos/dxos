//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';

import { registerSignalsRuntime } from '@dxos/echo-signals';

registerSignalsRuntime();

// TODO(burdon): Move to util.
export const updateCounter = (touch: () => void) => {
  let updateCount = -1;
  const unsubscribe = effect(() => {
    touch();
    updateCount++;
  });

  return {
    // https://github.com/tc39/proposal-explicit-resource-management
    [Symbol.dispose]: unsubscribe,
    get count() {
      return updateCount;
    },
  };
};
