//
// Copyright 2020 DXOS.org
//

import type { TestListMutation } from '@dxos/echo-protocol';

import { Model } from '../model';
import { schema } from '../proto';
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
    mutationCodec: schema.getCodecForType('dxos.testing.echo.TestListMutation')
  };

  get messages () {
    return this._getState();
  }

  async sendMessage (data: string) {
    const receipt = await this.write({ data });
    await receipt.waitToBeProcessed();
  }
}
