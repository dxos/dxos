//
// Copyright 2022 DXOS.org
//

/**
 * Observable interface returned to caller.
 */
export interface Observable<Events> {
  subscribe(callbacks: Events): void;
}

/**
 * Observable object created by provider.
 */
export class ObservableImpl<Events> implements Observable<Events> {
  private _callbacks?: Events;

  get callbacks() {
    return this._callbacks;
  }

  subscribe(callbacks: Events) {
    this._callbacks = callbacks;
  }

  clear() {
    this._callbacks = undefined;
  }
}
