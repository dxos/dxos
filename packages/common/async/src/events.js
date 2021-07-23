//
// Copyright 2020 DXOS.org
//

/* eslint-disable jest/no-export, jest/no-disabled-tests, jest/expect-expect, jest/valid-title */

import { promiseTimeout } from './async';

/**
 * Adds the listener and returns a function to remove it.
 * Promotes removing listeners when cleaning up objects (to prevent leaks).
 * @param {EventEmitter} eventEmitter
 * @param {string} eventName
 * @param {Function} callback
 */
export const onEvent = (eventEmitter, eventName, callback) => {
  eventEmitter.on(eventName, callback);

  return () => eventEmitter.off(eventName, callback);
};

// TODO(burdon): Remove.
export const addListener = (eventEmitter, eventName, callback) => {
  const off = onEvent(eventEmitter, eventName, callback);
  return {
    remove: () => off()
  };
};

/**
 * Waits for an event with an optional test condition.
 * @param {EventEmitter} eventEmitter
 * @param {string} eventName
 * @param {function} [test] Returns truthy value if the test passes.
 * @param {Number} [timeout]
 * @returns {Promise<unknown>}
 */
export const waitForEvent = (eventEmitter, eventName, test, timeout) => {
  let off;

  const promise = new Promise((resolve) => {
    off = onEvent(eventEmitter, eventName, (...args) => {
      if (!test || test(...args)) {
        resolve(...args);
      }
    });
  });

  return timeout ? promiseTimeout(promise, timeout).finally(off) : promise.finally(off);
};
