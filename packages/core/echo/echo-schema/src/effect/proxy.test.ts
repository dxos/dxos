//
// Copyright 2024 DXOS.org
//

import { describe, test } from '@dxos/test';
import * as R from './reactive';
import { expect } from 'chai';
import { registerSignalRuntime } from '@dxos/echo-signals';
import { effect } from '@preact/signals-core';
import { defer } from '@dxos/util';
import { inspect } from 'util';

registerSignalRuntime();

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
    const obj = R.object<any>({});

    const classInstance = new MyClass();
    obj.instance = classInstance;
    expect(obj.instance.field).to.eq('value');
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

  test('can assign array values', () => {
    const obj = R.object<any>({});

    obj.array = [1, 2, 3];
    expect(obj.array).to.deep.eq([1, 2, 3]);

    obj.array[0] = 4;
    expect(obj.array).to.deep.eq([4, 2, 3]);
  });

  test('can assign arrays with objects', () => {
    const obj = R.object<any>({});

    obj.array = [{ field: 'bar' }, { field: 'baz' }];
    expect(obj.array[0].field).to.eq('bar');

    obj.array[0].field = 'baz';
    expect(obj.array[0].field).to.eq('baz');

    obj.array[1].field = 'bar';
    expect(obj.array[1].field).to.eq('bar');
  });

  test('can assign arrays with arrays', () => {
    const obj = R.object<any>({});

    obj.array = [
      [1, 2, 3],
      [4, 5, 6],
    ];
    expect(obj.array[0][0]).to.eq(1);

    obj.array[0][0] = 4;
    expect(obj.array[0][0]).to.eq(4);
  });

  test('array sub-proxies maintain their identity', () => {
    const obj = R.object<any>({});

    obj.array = [{ field: 'bar' }];
    expect(obj.array === obj.array).to.be.true;
  });

  test('assigning another reactive object', () => {
    const obj = R.object<any>({});

    const other = R.object({ field: 'bar' });
    obj.other = other;
    expect(obj.other.field).to.eq('bar');

    obj.other.field = 'baz';
    expect(obj.other.field).to.eq('baz');

    other.field = 'qux';
    expect(obj.other.field).to.eq('qux');

    using updates = updateCounter(() => {
      obj.other.field;
    });

    expect(updates.count, 'update count').to.eq(0);
    other.field = 'quux';
    expect(updates.count, 'update count').to.eq(1);

    obj.other = { field: 'bar' };
    expect(obj.other.field).to.eq('bar');
    expect(updates.count, 'update count').to.eq(2);
  });

  test('keys enumeration', () => {
    const obj = R.object<any>({ field: 'bar' });
    expect(Object.keys(obj)).to.deep.eq(['field']);

    obj.field2 = 'baz';
    expect(Object.keys(obj)).to.deep.eq(['field', 'field2']);
  });

  test('has', () => {
    const obj = R.object<any>({ field: 'bar' });
    expect('field' in obj).to.be.true;
    expect('field2' in obj).to.be.false;

    obj.field2 = 'baz';
    expect('field2' in obj).to.be.true;
  });

  test('Array.isArray', () => {
    const obj = R.object<any>({ array: [1, 2, 3] });
    expect(Array.isArray(obj.array)).to.be.true;
  });

  test('instanceof', () => {
    const obj = R.object<any>({ array: [1, 2, 3], obj: { field: 'foo' } });

    expect(obj instanceof Object).to.be.true;
    expect(obj instanceof Array).to.be.false;
    expect(obj.array instanceof Object).to.be.true;
    expect(obj.array instanceof Array).to.be.true;
    expect(obj.obj instanceof Object).to.be.true;
    expect(obj.obj instanceof Array).to.be.false;
  });

  test('inspect', () => {
    const obj = R.object({ field: 'bar' });

    const str = inspect(obj, { colors: false });
    expect(str).to.eq("{ field: 'bar' }");
  });

  test('toString', () => {
    const obj = R.object({ field: 'bar' });
    expect(obj.toString()).to.eq('[object Object]'); // TODO(dmaretskyi): Change to `[object ECHO]`?
  });

  test('toJSON', () => {
    const obj = R.object(TEST_OBJECT);
    expect(JSON.stringify(obj)).to.eq(JSON.stringify(TEST_OBJECT));
  });

  test('chai deep equal works', () => {
    const obj = R.object(TEST_OBJECT);

    expect(obj).to.deep.eq(TEST_OBJECT);
    expect(obj).to.not.deep.eq({ ...TEST_OBJECT, number: 11 });
  });

  describe('signal updates', () => {
    test('are synchronous', () => {
      const obj = R.object({ field: 'bar' });

      using updates = updateCounter(() => {
        obj.field;
      });
      expect(updates.count, 'update count').to.eq(0);

      obj.field = 'baz';
      expect(updates.count, 'update count').to.eq(1);
    });

    test('in nested objects', () => {
      const obj = R.object({ object: { field: 'bar' } });

      using updates = updateCounter(() => {
        obj.object.field;
      });
      expect(updates.count, 'update count').to.eq(0);

      obj.object.field = 'baz';
      expect(updates.count, 'update count').to.eq(1);
    });

    test('not in nested class instances', () => {
      const obj = R.object({ instance: new MyClass() });

      using updates = updateCounter(() => {
        obj.instance.field;
      });
      expect(updates.count, 'update count').to.eq(0);

      obj.instance.field = 'baz';
      expect(updates.count, 'update count').to.eq(0);
    });

    test('in nested arrays', () => {
      const obj = R.object({ array: ['bar'] });

      using updates = updateCounter(() => {
        obj.array[0];
      });
      expect(updates.count, 'update count').to.eq(0);

      obj.array[0] = 'baz';
      expect(updates.count, 'update count').to.eq(1);
    });

    test('in nested arrays with objects', () => {
      const obj = R.object({ array: [{ field: 'bar' }] });

      using updates = updateCounter(() => {
        obj.array[0].field;
      });
      expect(updates.count, 'update count').to.eq(0);

      obj.array[0].field = 'baz';
      expect(updates.count, 'update count').to.eq(1);
    });

    test('in nested arrays with arrays', () => {
      const obj = R.object({ array: [[1, 2, 3]] });

      using updates = updateCounter(() => {
        obj.array[0][0];
      });
      expect(updates.count, 'update count').to.eq(0);

      obj.array[0][0] = 4;
      expect(updates.count, 'update count').to.eq(1);
    });
  });

  describe('array operations', () => {
    test('set by index', () => {
      const { array } = R.object({ array: [1, 2, 3] });
      using updates = updateCounter(() => {
        array[0];
      });

      array[0] = 2;
      expect(array[0]).to.eq(2);
      expect(updates.count, 'update count').to.eq(1);
    });

    // TODO(dmaretskyi): Fix array operations.
    test.skip('length', () => {
      const { array } = R.object({ array: [1, 2, 3] });
      using updates = updateCounter(() => {
        array[0];
      });
      expect(array.length).to.eq(3);

      array.push(4);
      expect(array.length).to.eq(4);
      expect(updates.count, 'update count').to.eq(1);
    });

    test('set length', () => {
      const { array } = R.object({ array: [1, 2, 3] });
      using updates = updateCounter(() => {
        array[0];
      });

      array.length = 2;
      expect(array.length).to.eq(2);
      expect(updates.count, 'update count').to.eq(1);
    });

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

// For testing.
class MyClass {
  field = 'value';

  toJSON() {
    return { field: this.field };
  }
}

const updateCounter = (touch: () => void) => {
  let updateCount = -1;
  const clear = effect(() => {
    touch();
    updateCount++;
  });

  return {
    get count() {
      return updateCount;
    },
    // https://github.com/tc39/proposal-explicit-resource-management
    [Symbol.dispose]: clear,
  };
};

const TEST_OBJECT = {
  string: 'foo',
  number: 42,
  boolean: true,
  null: null,
  undefined: undefined,
  array: [1, 2, 3],
  object: { field: 'bar' },
  classInstance: new MyClass(),
};
