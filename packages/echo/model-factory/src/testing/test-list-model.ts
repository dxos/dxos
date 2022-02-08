//
// Copyright 2020 DXOS.org
//

import { MutationMeta, schema, TestListMutation } from '@dxos/echo-protocol';

import { Model } from '../model';
import { StateMachine } from '../state-machine';
import { ModelMeta } from '../types';

class TestListModelStateMachiene implements StateMachine<TestListMutation[], TestListMutation, any> {
  private _messages: TestListMutation[] = []

  getState (): TestListMutation[] {
    return this._messages;
  }

  process (mutation: TestListMutation, meta: MutationMeta): void {
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
    mutation: schema.getCodecForType('dxos.echo.testing.TestListMutation'),
    stateMachine: () => new TestListModelStateMachiene()
  };

  get messages () {
    return this._getState();
  }

  async sendMessage (data: string) {
    const receipt = await this.write({ data });
    await receipt.waitToBeProcessed();
  }
}
