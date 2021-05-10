//
// Copyright 2020 DXOS.org
//

import { checkType } from '@dxos/debug';
import { FeedMeta, schema, TestItemMutation } from '@dxos/echo-protocol';

import { Model } from '../model';
import { ModelMeta } from '../types';

/**
 * Test model.
 */
export class TestModel extends Model<TestItemMutation> {
  static meta: ModelMeta = {
    type: 'dxn://dxos/model/test',
    mutation: schema.getCodecForType('dxos.echo.testing.TestItemMutation')
  };

  private _values = new Map();

  get keys () {
    return Array.from(this._values.keys());
  }

  get properties () {
    return Object.fromEntries(this._values);
  }

  getProperty (key: string) {
    return this._values.get(key);
  }

  async setProperty (key: string, value: string) {
    await this.write(checkType<TestItemMutation>({
      key,
      value
    }));
  }

  async _processMessage (meta: FeedMeta, message: TestItemMutation) {
    const { key, value } = message;
    this._values.set(key, value);
    return true;
  }
}
