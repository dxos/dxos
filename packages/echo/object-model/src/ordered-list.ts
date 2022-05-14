//
// Copyright 2020 DXOS.org
//

import { ItemID } from '@dxos/echo-protocol';

import { ObjectModel } from './object-model';

/**
 *
 */
export class OrderedList {
  private _values: ItemID[] = [];

  constructor (
    private readonly _model: ObjectModel,
    private readonly _property = 'order'
  ) {
    this.update();
  }

  get values () {
    return this._values;
  }

  /**
   * Reload list from properties.
   */
  // TODO(burdon): More tests for edge cases.
  update () {
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
        // [a, b, c] + [x, b] => [a, x, b, c]     # i === -1 j ===  1
        this._values.splice(j, 1, left as ItemID, right as ItemID);
      } else if (j === -1) {
        // [a, b, c] + [b, x] => [a, b, x, c]     # i ===  1 j === -1
        this._values.splice(i, 1, left as ItemID, right as ItemID);
      }
    }

    return this;
  }

  async clear () {
    await this._model.set(this._property, {}); // TODO(burdon): Allow set undefined.
    this.update();
    return this._values;
  }

  async set (values: ItemID[]) {
    // TODO(burdon): Create single mutation set.
    let [left, ...rest] = values;
    for (const value of rest) {
      const key = `${this._property}.${left}`;
      const current = this._model.get(key)
      await this._model.set(key, value);
      if (current) {
        await this._model.set(`${this._property}.${value}`, current);
      }
      left = value;
    }

    this.update();
    return this._values;
  }

  async remove (values: ItemID[]) {
    // TODO(burdon): Create mutation.
    this.update();
    return this._values;
  }
}
