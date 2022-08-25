//
// Copyright 2022 DXOS.org
//

import faker from 'faker';

export const encode = (obj: any) => Buffer.from(JSON.stringify(obj));
export const decode = (data: Buffer) => JSON.parse(data.toString());

// TODO(burdon): Local proto def.
export enum TestOperation { ADD, MULTIPLY }
export type TestAction = { operation: TestOperation, value: number }

export class TestStateMachine {
  _value = 0;

  get value () {
    return this._value;
  }

  execute (action: TestAction) {
    switch (action.operation) {
      case TestOperation.ADD: {
        this._value = this._value + action.value;
        break;
      }

      case TestOperation.MULTIPLY: {
        this._value = this._value * action.value;
        break;
      }
    }
  }
}

export const createTestMessage = (): TestAction => {
  return {
    operation: faker.random.arrayElement([TestOperation.ADD, TestOperation.MULTIPLY]),
    value: faker.datatype.number({ min: -9, max: 9 })
  };
};
