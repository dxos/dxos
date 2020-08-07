//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { sleep } from '@dxos/async';

import { Model } from './database';

import { dxos } from './proto/gen/testing';
import { assertTypeUrl } from './util';

/**
 * Test model.
 */
export class TestModel extends Model {
  // TODO(burdon): Format?
  static type = 'wrn://dxos.io/model/test';

  _values = new Map();

  get keys () {
    return Array.from(this._values.keys());
  }

  get value () {
    return Object.fromEntries(this._values);
  }

  getValue (key: string) {
    return this._values.get(key);
  }

  async processMessage (message: dxos.echo.testing.IFeedMessage) {
    const mutation = message.data?.message as dxos.echo.testing.IItemMutation;
    assert(mutation);
    assertTypeUrl(mutation, 'dxos.echo.testing.ItemMutation');

    const { key, value } = mutation;
    await sleep(50);
    this._values.set(key, value);
  }

  async setProperty (key: string, value: string) {
    await this.write({
      __type_url: 'dxos.echo.testing.ItemMutation',
      key,
      value
    });
  }
}
