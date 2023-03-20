//
// Copyright 2023 DXOS.org
//

import { Event, UnsubscribeCallback } from '@dxos/async';

/**
 * An array of items which change over time.
 */
// TODO(wittjosiah): Factor out to `@dxos/async`?
export class Collection<T> {
  private _items: T[] = [];

  constructor(private readonly _update: Event<T[]>) {
    this._update.on((items) => (this._items = items));
  }

  /**
   * Get the current state of the collection.
   */
  get(): T[] {
    return this._items;
  }

  /**
   * Subscribe to changes in this collection.
   */
  subscribe(callback: (items: T[]) => void): UnsubscribeCallback {
    callback(this._items);
    return this._update.on(callback);
  }
}
