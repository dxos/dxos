//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';

import { Event } from '@dxos/async';
import { ItemID } from '@dxos/echo-protocol';

import { ObjectModel } from './object-model';

/**
 * Utility class that wraps an `ObjectModel` and implements a linked list via key-values on a given property.
 */
export class OrderedList {
  private _values: ItemID[] = [];

  update = new Event<ItemID[]>();

  private _unsubscribe: () => void;

  constructor (
    private readonly _model: ObjectModel,
    private readonly _property = 'order'
  ) {
    this.refresh();
    this._unsubscribe = this._model.update.on(() => this.refresh());
  }

  get id () {
    return this._model.itemId;
  }

  /**
   * Get ordered values.
   */
  get values () {
    return this._values;
  }

  destroy () {
    this._unsubscribe();
  }

  /**
   * Refresh list from properties.
   */
  // TODO(burdon): Add more tests for edge cases.
  refresh () {
    this._values = [];
    const properties = this._model.get(this._property) ?? {};
    for (const [left, right] of Object.entries(properties)) {
      const i = this._values.findIndex(value => value === left);
      const j = this._values.findIndex(value => value === right);
      if (i === -1 && j === -1) {
        // Append.
        // [a, b, c] + [x, y] => [a, b, c, x, y]
        this._values.splice(this._values.length, 0, left as ItemID, right as ItemID);
      } else if (i === -1) {
        // Merge to the left.
        // [a, b, c] + [x, b] => [a, x, b, c] (i === -1; j ===  1)
        this._values.splice(j, 1, left as ItemID, right as ItemID);
      } else if (j === -1) {
        // Merge to the right.
        // [a, b, c] + [b, x] => [a, b, x, c] (i ===  1; j === -1)
        this._values.splice(i, 1, left as ItemID, right as ItemID);
      } else {
        // TODO(burdon): If both defined then may need to break existing links.
      }
    }

    this.update.emit(this.values);
    return this;
  }

  /**
   * Clears the ordered set with the optional values.
   */
  async init (values?: ItemID[]) {
    const builder = this._model.builder();

    // Reset.
    builder.set(this._property, undefined);

    // Set initial order.
    if (values && values.length >= 2) {
      const [first, ...rest] = values!;
      let left = first;
      for (const value of rest) {
        builder.set(`${this._property}.${left}`, value);
        left = value;
      }
    }

    const commited = builder.commit();
    this.refresh();
    await commited;
    return this._values;
  }

  /**
   * Links the ordered items, possibly linking them to existing items.
   */
  async insert (left: ItemID, right: ItemID) {
    assert(left && right);

    // May be undefined.
    const next = this._model.get(`${this._property}.${left}`);
    const last = this._model.get(`${this._property}.${right}`);

    if (next !== right) {
      const builder = this._model.builder();

      // Connect directly.
      builder.set(`${this._property}.${left}`, right);

      if (next) {
        // Insert after left.
        builder.set(`${this._property}.${right}`, next);
        builder.set(`${this._property}.${next}`, last);
      }

      const commited = builder.commit();
      this.refresh();
      await commited;
    }

    return this._values;
  }

  /**
   * Removes the given element, possibly linked currently connected items.
   */
  async remove (values: ItemID[]) {
    const builder = this._model.builder();
    for (const value of values) {
      const map = this._model.get(this._property);
      const left = Object.keys(map).find(key => map[key] === value);
      const right = map[value];
      if (right) {
        builder.set(`${this._property}.${value}`, undefined);
      }
      if (left) {
        builder.set(`${this._property}.${left}`, right);
      }
    }

    const commited = builder.commit();
    this.refresh();
    await commited;
    return this._values;
  }
}
