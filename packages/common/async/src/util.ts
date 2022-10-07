//
// Copyright 2020 DXOS.org
//

import { EventEmitter } from 'events';

import { promiseTimeout } from './async';

/**
 * Adds the listener and returns a function to remove it.
 * Promotes removing listeners when cleaning up objects (to prevent leaks).
 * @param {EventEmitter} eventEmitter
 * @param {string} eventName
 * @param {Function} callback
 */
export const onEvent = (eventEmitter: EventEmitter, eventName: string, callback: (args: any) => void) => {
  eventEmitter.on(eventName, callback);
  return () => eventEmitter.off(eventName, callback);
};

/**
 * @deprecated
 */
// TODO(burdon): Remove.
export const addListener = (eventEmitter: EventEmitter, eventName: string, callback: () => void) => {
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
 * @param {unknown} [error]
 * @returns {Promise<unknown>}
 */
export const waitForEvent = (
  eventEmitter: EventEmitter,
  eventName: string,
  test?: (args: any) => boolean,
  timeout?: number,
  error?: Error | string
): Promise<any> => {
  let off;

  const promise = new Promise((resolve) => {
    off = onEvent(eventEmitter, eventName, (...args) => {
      if (!test || test(...args)) {
        resolve(...args);
      }
    });
  });

  return timeout ? promiseTimeout(promise, timeout, error ?? new Error()).finally(off) : promise.finally(off);
};
