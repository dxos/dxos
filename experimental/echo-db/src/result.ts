//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { Event } from '@dxos/async';

/**
 * Reactive query results.
 */
export class ResultSet<T> {
  private readonly _resultsUpdate = new Event<T[]>();
  private readonly _itemUpdate: Event<T>;
  private readonly _getter: () => T[];
  private _value: T[];
  private _handleUpdate: () => void;

  constructor (itemUpdate: Event<T>, getter: () => T[]) {
    assert(itemUpdate);
    assert(getter);
    this._itemUpdate = itemUpdate;
    this._getter = getter;

    // Current value.
    this._value = this._getter();

    // Update handler.
    this._handleUpdate = () => {
      this._value = this._getter();
      this._resultsUpdate.emit(this._value);
    };
  }

  get value (): T[] {
    return this._value;
  }

  get first (): T {
    assert(this._value.length);
    return this._value[0];
  }

  /**
   * Subscribe for updates.
   * @param listener
   */
  // TODO(burdon): Create abstraction for hierarchical subscriptions.
  subscribe (listener: (result: T[]) => void) {
    this._resultsUpdate.on(listener);
    if (this._resultsUpdate.listenerCount() === 1) {
      this._itemUpdate.on(this._handleUpdate);
    }

    // TODO(burdon): Return subscription object with unsubscribe method?
    return () => {
      this._resultsUpdate.off(listener);
      if (this._resultsUpdate.listenerCount() === 0) {
        this._itemUpdate.off(this._handleUpdate);
      }
    };
  }
}
