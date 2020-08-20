//
// Copyright 2020 DXOS.org
//

import { sleep } from '@dxos/async';

import { dxos } from '../proto/gen/testing';

import { IFeedMeta } from '../feeds';
import { Model, ModelType } from '../models';
import { createMessage } from '../proto';

/**
 * Test model.
 */
export class TestModel extends Model<dxos.echo.testing.IItemMutation> {
  static type: ModelType = 'drn://dxos.org/model/test';

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
    await this.write(createMessage<dxos.echo.testing.IItemMutation>({
      set: {
        key,
        value
      }
    }, 'dxos.echo.testing.ItemMutation'));
  }

  async appendProperty (key: string, value: string) {
    await this.write(createMessage<dxos.echo.testing.IItemMutation>({
      append: {
        key,
        value
      }
    }, 'dxos.echo.testing.ItemMutation'));
  }

  async processMessage (meta: IFeedMeta, mutation: dxos.echo.testing.IItemMutation) {
    if (mutation.set) {
      const { set: { key, value } } = mutation;
      this._values.set(key, value);
    }

    if (mutation.append) {
      const { append: { key, value } } = mutation;
      const current = this._values.get(key) || '';
      this._values.set(key, current + ':' + value);
    }

    await sleep(50);
    super.update();
  }
}
