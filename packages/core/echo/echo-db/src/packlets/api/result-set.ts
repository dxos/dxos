//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';

import { Event, ReadOnlyEvent } from '@dxos/async';

/**
 * Reactive query results.
 * @deprecated
 */
// TODO(burdon): Replace with Selection or make type specific (e.g., currently use for items and spaces).
export class ResultSet<T> {
  private readonly _resultsUpdate = new Event<T[]>();
  private readonly _itemUpdate: ReadOnlyEvent;
  private readonly _getter: () => T[];

  /**
   * Triggered when `value` updates.
   */
  readonly update: ReadOnlyEvent<T[]> = this._resultsUpdate;

  constructor(itemUpdate: ReadOnlyEvent, getter: () => T[]) {
    assert(itemUpdate);
    assert(getter);
    this._itemUpdate = itemUpdate;
    this._getter = getter;

    this._resultsUpdate.addEffect(() =>
      this._itemUpdate.on(() => {
        this._resultsUpdate.emit(this._getter());
      })
    );
  }

  get value(): T[] {
    // TODO(dmaretskyi): Discuss whether this needs optimization.
    return this._getter();
  }

  get first(): T {
    const value = this._getter();
    assert(value.length);
    return value[0];
  }

  /**
   * Subscribe for updates.
   * @param listener
   */
  subscribe(listener: (result: T[]) => void) {
    return this._resultsUpdate.on(listener);
  }

  /**
   * Waits for condition to be true and then returns the value that passed the condition first.
   *
   * Current value is also checked.
   */
  waitFor(condition: (data: T[]) => boolean): Promise<T[]> {
    if (condition(this.value)) {
      return Promise.resolve(this.value);
    }

    return this._resultsUpdate.waitFor(condition);
  }
}
