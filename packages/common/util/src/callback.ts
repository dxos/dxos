//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

/**
 * Represents a callback that can be set once.
 *
 * Common usage is dependency injection.
 * In contrast to events, callbacks can only have one handler,
 * are executed synchronously,
 * and can return results.
 */
export class Callback<T extends (...args: any[]) => any> {
  private _callback: T | undefined;

  public call (...args: Parameters<T>): ReturnType<T> {
    assert(this._callback, 'Callback not set');

    return this._callback(...args);
  }

  public callIfSet (...args: Parameters<T>): ReturnType<T> | undefined {
    return this._callback?.(...args);
  }

  public set (callback: T) {
    assert(!this._callback, 'Callback already set');
    this._callback = callback;
  }

  public isSet () {
    return !!this._callback;
  }
}
