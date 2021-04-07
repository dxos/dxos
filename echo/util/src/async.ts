//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import { EventEmitter } from 'events';

import { trigger } from '@dxos/async';

/**
 * Waits for the specified number of events from the given emitter.
 * @param emitter
 * @param event
 * @param count
 */
// TODO(marik-d): Use version from @dxos/async
export const sink = (emitter: EventEmitter, event: string, count = 1) => {
  let resolver: Function;

  let counter = 0;
  const listener = () => {
    if (++counter === count) {
      emitter.off(event, listener);
      resolver();
    }
  };

  emitter.on(event, listener);

  return new Promise(resolve => {
    resolver = resolve;
  });
};

// TODO(marik-d): Use version from @dxos/async
export const latch = (n = 1) => {
  assert(n > 0);

  let callback: (value: number) => void;
  const promise = new Promise<number>((resolve) => {
    callback = value => resolve(value);
  });

  let count = 0;
  return [
    promise,
    () => {
      if (++count === n) {
        callback(count);
      }
    }
  ] as const;
};

// TODO(marik-d): Use version from @dxos/async
export class Trigger {
  _promise!: Promise<void>;
  _wake!: () => void;

  constructor () {
    this.reset();
  }

  wait () {
    return this._promise;
  }

  wake () {
    this._wake();
  }

  reset () {
    const [getPromise, wake] = trigger();
    this._promise = getPromise();
    this._wake = wake;
  }
}
