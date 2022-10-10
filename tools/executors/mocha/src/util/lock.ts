//
// Copyright 2022 DXOS.org
//

import { trigger } from './trigger.js';

// Copied from @dxos/async.
export class Lock {
  private _lastPromise = Promise.resolve();

  async executeSynchronized<T> (fun: () => Promise<T>): Promise<T> {
    const prevPromise = this._lastPromise;
    const [getPromise, resolve] = trigger();
    this._lastPromise = getPromise();

    await prevPromise;
    try {
      const value = await fun();
      return value;
    } finally {
      resolve();
    }
  }
}
