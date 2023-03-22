//
// Copyright 2023 DXOS.org
//

import { Event, UnsubscribeCallback } from '@dxos/async';

/**
 * A value which changes over time.
 */
// TODO(wittjosiah): Factor out to `@dxos/async`?
export class Observable<T> {
  // prettier-ignore
  constructor(
    private _value: T,
    // TODO(wittjosiah): Investigate alternative underlying obeservable implementations.
    private readonly _update: Event<T>
  ) {
    this._update.on((value) => (this._value = value));
  }

  /**
   * Get the current value.
   */
  get(): T {
    return this._value;
  }

  /**
   * Subscribe to changes of this value.
   */
  subscribe(callback: (value: T) => void): UnsubscribeCallback {
    callback(this._value);
    return this._update.on(callback);
  }
}
