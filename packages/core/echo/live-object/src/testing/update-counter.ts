//
// Copyright 2025 DXOS.org
//

import { type Live, subscribe } from '../live';

/**
 * Creates an update counter that tracks changes to live objects.
 * @param objects - Live objects to subscribe to.
 * @returns An object with a count property and Symbol.dispose for cleanup.
 */
export const updateCounter = (...objects: Live<object>[]) => {
  let updateCount = 0;

  const unsubscribes = objects.map((obj) =>
    subscribe(obj, () => {
      updateCount++;
    }),
  );

  const unsubscribeAll = () => {
    for (const unsub of unsubscribes) {
      unsub();
    }
  };

  return {
    // https://github.com/tc39/proposal-explicit-resource-management
    [Symbol.dispose]: unsubscribeAll,
    get count() {
      return updateCount;
    },
  };
};
