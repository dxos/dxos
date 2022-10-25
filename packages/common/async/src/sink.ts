//
// Copyright 2020 DXOS.org
//

import { EventEmitter } from 'events';

import { trigger } from './trigger';

/**
 * Waits for the specified number of events from the given emitter.
 */
export const sink = (
  emitter: EventEmitter,
  event: string,
  count = 1
): Promise<void> => {
  const [getPromise, resolve] = trigger();

  let counter = 0;
  const listener = () => {
    if (++counter === count) {
      emitter.off(event, listener);
      resolve();
    }
  };

  emitter.on(event, listener);

  return getPromise();
};
