//
// Copyright 2020 DXOS.org
//

import { EventEmitter } from 'events';

import { asyncTimeout } from './timeout';

/**
 * Adds the listener and returns a function to remove it.
 * Promotes removing listeners when cleaning up objects (to prevent leaks).
 */
export const onEvent = (eventEmitter: EventEmitter, eventName: string, callback: (args: any) => void) => {
  eventEmitter.on(eventName, callback);
  return () => eventEmitter.off(eventName, callback);
};

/**
 * @deprecated
 */
export const addListener = (eventEmitter: EventEmitter, eventName: string, callback: () => void) => {
  const off = onEvent(eventEmitter, eventName, callback);
  return {
    remove: () => off()
  };
};

/**
 * Waits for an event with an optional test condition.
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

  return timeout ? asyncTimeout(promise, timeout, new Error('xxx')).finally(off) : promise.finally(off);
  // return timeout ? asyncTimeout(promise, timeout, error ?? new Error()).finally(off) : promise.finally(off);
};
