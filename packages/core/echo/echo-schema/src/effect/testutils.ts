//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';

export const updateCounter = (touch: () => void) => {
  let updateCount = -1;
  const clear = effect(() => {
    touch();
    updateCount++;
  });

  return {
    get count() {
      return updateCount;
    },
    // https://github.com/tc39/proposal-explicit-resource-management
    [Symbol.dispose]: clear,
  };
};
