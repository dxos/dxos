//
// Copyright 2020 DXOS.org
//

import { checkType } from '@dxos/debug';
import { FeedMeta, TestItemMutation, schema, MutationMeta } from '@dxos/echo-protocol';

import { Model } from '../model';
import { StateMachine } from '../state-machiene';
import { ModelMeta } from '../types';

class TestModelStateMachiene implements StateMachine<Map<any, any>, TestItemMutation, any>  {
  private readonly _state = new Map();

  getState(): Map<any, any> {
    return this._state;
  }
  process(mutation: TestItemMutation, meta: MutationMeta): void {
    const { key, value } = mutation;
    this._state.set(key, value);
  }

  snapshot() {
    throw new Error('Method not implemented.');
  }
  reset(snapshot: any): void {
    throw new Error('Method not implemented.');
  }
}

/**
 * Test model.
 */
export class TestModel extends Model<Map<any, any>, TestItemMutation> {
  static meta: ModelMeta = {
    type: 'dxos:model/test',
    mutation: schema.getCodecForType('dxos.echo.testing.TestItemMutation'),
    stateMachiene: () => new TestModelStateMachiene(),
  };

  get keys () {
    return Array.from(this._getState().keys());
  }

  get properties () {
    return Object.fromEntries(this._getState());
  }

  getProperty (key: string) {
    return this._getState().get(key);
  }

  async setProperty (key: string, value: string) {
    const receipt = await this.write(checkType<TestItemMutation>({
      key,
      value
    }));
    await receipt.waitToBeProcessed();
  }
}
