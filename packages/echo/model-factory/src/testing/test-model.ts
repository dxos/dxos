//
// Copyright 2020 DXOS.org
//

import { checkType } from '@dxos/debug';
import type { TestItemMutation, TestItemSnapshot } from '@dxos/echo-protocol';

import { Model } from '../model';
import { schema } from '../proto';
import { ModelMeta, MutationProcessMeta, StateMachine } from '../types';

class TestModelStateMachine implements StateMachine<Map<any, any>, TestItemMutation, TestItemSnapshot> {
  private readonly _state = new Map();

  getState (): Map<any, any> {
    return this._state;
  }

  process (mutation: TestItemMutation, meta: MutationProcessMeta): void {
    const { key, value } = mutation;
    this._state.set(key, value);
  }

  snapshot (): TestItemSnapshot {
    return {
      keys: Array.from(this._state.entries()).map(([key, value]) => ({ key, value }))
    };
  }

  reset (snapshot: TestItemSnapshot): void {
    this._state.clear();
    (snapshot.keys ?? []).forEach(({ key, value }) => this._state.set(key, value));
  }
}

export class TestModel extends Model<Map<any, any>, TestItemMutation> {
  static meta: ModelMeta = {
    type: 'dxos:model/test',
    stateMachine: () => new TestModelStateMachine(),
    mutationCodec: schema.getCodecForType('dxos.test.echo.TestItemMutation'),
    snapshotCodec: schema.getCodecForType('dxos.test.echo.TestItemSnapshot')
  };

  get keys () {
    return Array.from(this._getState().keys());
  }

  get properties () {
    return Object.fromEntries(this._getState());
  }

  get (key: string) {
    return this._getState().get(key);
  }

  async set (key: string, value: string) {
    const receipt = await this.write(checkType<TestItemMutation>({
      key,
      value
    }));

    await receipt.waitToBeProcessed();
  }
}
