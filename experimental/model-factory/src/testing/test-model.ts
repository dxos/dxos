//
// Copyright 2020 DXOS.org
//

import { dxos, FeedMeta } from '@dxos/experimental-echo-protocol';
import { checkType } from '@dxos/experimental-util';

import { Model } from '../model';
import { ModelMeta } from '../types';

/**
 * Test model.
 */
export class TestModel extends Model<dxos.echo.testing.ITestItemMutation> {
  static meta: ModelMeta = {
    type: 'wrn://dxos.org/model/test',
    mutation: 'dxos.echo.testing.TestItemMutation'
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
    await this.write(checkType<dxos.echo.testing.ITestItemMutation>({
      key,
      value
    }));
  }

  async _processMessage (meta: FeedMeta, message: dxos.echo.testing.ITestItemMutation) {
    const { key, value } = message;
    this._values.set(key, value);
    return true;
  }
}
