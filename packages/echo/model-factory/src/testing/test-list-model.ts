//
// Copyright 2020 DXOS.org
//

import { FeedMeta, schema, TestListMutation } from '@dxos/echo-protocol';

import { Model } from '../model';
import { ModelMeta } from '../types';

/**
 * Test model.
 */
export class TestListModel extends Model<TestListMutation> {
  static meta: ModelMeta = {
    type: 'dxn://dxos/model/test-list',
    mutation: schema.getCodecForType('dxos.echo.testing.TestListMutation')
  };

  private _messages: TestListMutation[] = []

  get messages () {
    return this._messages;
  }

  async sendMessage (data: string) {
    const receipt = await this.write({ data });
    await receipt.waitToBeProcessed();
  }

  async _processMessage (meta: FeedMeta, message: TestListMutation) {
    this._messages.push(message);
    return true;
  }
}
