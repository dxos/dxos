//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import get from 'lodash/get';
import set from 'lodash/set';
import { ObjectProperties } from './object-model';

type Test = {
  module?: {
    title?: string
    dependencies?: string[]
  }
}

class TestObject<T> implements ObjectProperties {
  private _properties: T = {} as T;

  get object (): T {
    return this._properties;
  }

  get (key: string, defaultValue?: any): any {
    return get(this._properties, key, defaultValue);
  }

  async set (key: string, value: any) {
    set(this._properties as any, key, value);
  }
}

describe('Experimental properties', () => {
  // TODO(burdon): Test mutation protos.
  // TODO(burdon): Figure out mapping of "set" operator to construction of mutations.
  it('Mutations', async () => {
    const object = new TestObject<Test>();
    await object.set('module.title', 'test');
    await object.set('module.dependencies[0]', 'dxos');
    expect(object.get('module.title')).toEqual('test');
    expect(object.object).toEqual({ module: { title: 'test', dependencies: ['dxos'] } });
  });
});
