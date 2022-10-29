//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

/**
 * Observable interface returned to caller.
 */
export interface Observable<Events> {
  observe(callbacks: Events): void;
}

/**
 * Observable object created by provider.
 */
export class ObservableImpl<Events> implements Observable<Events> {
  private _callbacks?: Events;

  get callbacks() {
    return this._callbacks;
  }

  observe(callbacks: Events) {
    this._callbacks = callbacks;
  }

  clear() {
    this._callbacks = undefined;
  }
}
