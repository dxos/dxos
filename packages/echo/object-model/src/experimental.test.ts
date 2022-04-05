//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import get from 'lodash.get';
import set from 'lodash.set';

import { ObjectProperties } from './object-model';

type Test = {
  module?: {
    title?: string
    dependencies?: string[]
  }
}

class TestObjectModel<T> implements ObjectProperties {
  private _properties: T = {} as T;

  get object (): T {
    return this._properties;
  }

  get (key: string, defaultValue?: any): any {
    return get(this._properties, key, defaultValue);
  }

  // TODO(burdon): Figure out mapping of "set" operator to construction of mutations.
  async set (key: string, value: any) {
    set(this._properties as any, key, value);
  }
}

describe('Experimental', () => {
  // TODO(burdon): Test mutation protos.
  it('Mutations', async () => {
    const object = new TestObjectModel<Test>();
    await object.set('module.title', 'test');
    await object.set('module.dependencies[0]', 'dxos');
    expect(object.get('module.title')).toEqual('test');
    expect(object.object).toEqual({ module: { title: 'test', dependencies: ['dxos'] } });
  });
});
