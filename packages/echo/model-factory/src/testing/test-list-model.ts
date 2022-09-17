//
// Copyright 2020 DXOS.org
//

import { schema } from '@dxos/protocols';
import type { TestListMutation } from '@dxos/protocols/proto/dxos/testing/data';

import { Model } from '../model';
import { ModelMeta, MutationProcessMeta, StateMachine } from '../types';

class TestListModelStateMachine implements StateMachine<TestListMutation[], TestListMutation, any> {
  private _messages: TestListMutation[] = [];

  getState (): TestListMutation[] {
    return this._messages;
  }

  process (mutation: TestListMutation, meta: MutationProcessMeta): void {
    this._messages.push(mutation);
  }

  snapshot () {
    throw new Error('Method not implemented.');
  }

  reset (snapshot: any): void {
    throw new Error('Method not implemented.');
  }
}

/**
 * Test model.
 */
export class TestListModel extends Model<TestListMutation[], TestListMutation> {
  static meta: ModelMeta = {
    type: 'dxos:model/test-list',
    stateMachine: () => new TestListModelStateMachine(),
    mutationCodec: schema.getCodecForType('dxos.testing.data.TestListMutation')
  };

  get messages () {
    return this._getState();
  }

  async sendMessage (data: string) {
    const receipt = await this.write({ data });
    await receipt.waitToBeProcessed();
  }
}
