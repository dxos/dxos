//
// Copyright 2024 DXOS.org
//

import { describe, test } from '@dxos/test';
import * as R from './reactive';
import { expect } from 'chai';

describe('Proxy properties', () => {
  test('object initializer', () => {
    const obj = R.object({ field: 'bar' });
    expect(obj.field).to.eq('bar');

    obj.field = 'baz';
    expect(obj.field).to.eq('baz');
  });

  test('can assign scalar values', () => {
    const obj = R.object<any>({});

    obj.string = 'foo';
    obj.number = 42;
    obj.boolean = true;
    obj.null = null;
    obj.undefined = undefined;

    expect(obj.string).to.eq('foo');
    expect(obj.number).to.eq(42);
    expect(obj.boolean).to.eq(true);
    expect(obj.null).to.eq(null);
    expect(obj.undefined).to.eq(undefined);
  });

  test('can assign object values', () => {
    const obj = R.object<any>({});

    obj.object = { field: 'bar' };
    expect(obj.object.field).to.eq('bar');

    obj.object.field = 'baz';
    expect(obj.object.field).to.eq('baz');
  });

  test('can assign class instances', () => {
    class MyClass {
      field = 'bar';
    }

    const obj = R.object<any>({});

    const classInstance = new MyClass();
    obj.instance = classInstance;
    expect(obj.instance.field).to.eq('bar');
    expect(obj.instance instanceof MyClass).to.eq(true);
    expect(obj.instance === classInstance).to.be.true;

    obj.instance.field = 'baz';
    expect(obj.instance.field).to.eq('baz');
  });

  test('sub-proxies maintain their identity', () => {
    const obj = R.object<any>({});

    obj.object = { field: 'bar' };
    expect(obj.object === obj.object).to.be.true;
  });

  test('can assign array values');
  test('can assign arrays with objects');
  test('can assign arrays with arrays');
  test('array sub-proxies maintain their identity');
  test('assigning another reactive object');
  test('signal updates are synchronous');
  test('signal updates in nested elements');
  test('keys enumeration');
  test('has');
  test('instanceof');
  test('inspect');
  test('toString');
  test('toJSON');
  test('chai deep equal works', () => {});
  describe('array operations', () => {
    test('push');
    test('pop');
    test('shift');
    test('unshift');
    test('splice');
    test('sort');
    test('reverse');
    test('map');
    test('flatMap');
    test('flat');
    test('forEach');
    test('spreading');
  });
});
