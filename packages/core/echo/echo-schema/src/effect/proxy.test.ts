//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
import { expect } from 'chai';
import { default as jestExpect } from 'expect';
import { inspect } from 'util';

import { registerSignalRuntime } from '@dxos/echo-signals';
import { describe, test } from '@dxos/test';

import * as R from './reactive';

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
    // eslint-disable-next-line no-self-compare
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
    // eslint-disable-next-line no-self-compare
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

  test('jest deep equal works', () => {
    const obj = R.object(TEST_OBJECT);

    jestExpect(obj).toEqual(TEST_OBJECT);
    jestExpect(obj).not.toEqual({ ...TEST_OBJECT, number: 11 });
  });

  // Not a typical use case, but might come up when interacting with 3rd party libraries.
  test('defineProperty', () => {
    const obj = R.object<any>({});
    using updates = updateCounter(() => {
      obj.field;
    });

    Object.defineProperty(obj, 'field', { value: 'bar' });
    expect(obj.field).to.eq('bar');
    expect(updates.count, 'update count').to.eq(1);
  });

  test('getOwnPropertyDescriptor', () => {
    const obj = R.object<any>({ field: 'bar' });
    const descriptor = Object.getOwnPropertyDescriptor(obj, 'field');

    expect(descriptor).to.deep.eq({
      value: 'bar',
      writable: true,
      enumerable: true,
      configurable: true,
    });
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

    test('length', () => {
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

    test('push', () => {
      const { array } = R.object({ array: [1, 2, 3] });
      using updates = updateCounter(() => {
        array[0];
      });

      array.push(4);
      expect(array).to.deep.eq([1, 2, 3, 4]);
      expect(updates.count, 'update count').to.eq(1);
    });

    test('pop', () => {
      const { array } = R.object({ array: [1, 2, 3] });
      using updates = updateCounter(() => {
        array[0];
      });

      const value = array.pop();
      expect(value).to.eq(3);
      expect(array).to.deep.eq([1, 2]);
      expect(updates.count, 'update count').to.eq(1);
    });

    test('shift', () => {
      const { array } = R.object({ array: [1, 2, 3] });
      using updates = updateCounter(() => {
        array[0];
      });

      const value = array.shift();
      expect(value).to.eq(1);
      expect(array).to.deep.eq([2, 3]);
      expect(updates.count, 'update count').to.eq(1);
    });

    test('unshift', () => {
      const { array } = R.object({ array: [1, 2, 3] });
      using updates = updateCounter(() => {
        array[0];
      });

      const newLength = array.unshift(0);
      expect(newLength).to.eq(4);
      expect(array).to.deep.eq([0, 1, 2, 3]);
      expect(updates.count, 'update count').to.eq(1);
    });

    test('splice', () => {
      const { array } = R.object({ array: [1, 2, 3] });
      using updates = updateCounter(() => {
        array[0];
      });

      const removed = array.splice(1, 1, 4);
      expect(removed).to.deep.eq([2]);
      expect(array).to.deep.eq([1, 4, 3]);
      expect(updates.count, 'update count').to.eq(1);
    });

    test('sort', () => {
      const { array } = R.object({ array: [3, 2, 1] });
      using updates = updateCounter(() => {
        array[0];
      });

      const returnValue = array.sort();
      expect(returnValue === array).to.be.true;
      expect(array).to.deep.eq([1, 2, 3]);
      expect(updates.count, 'update count').to.eq(1);
    });

    test('reverse', () => {
      const { array } = R.object({ array: [1, 2, 3] });
      using updates = updateCounter(() => {
        array[0];
      });

      const returnValue = array.reverse();
      expect(returnValue === array).to.be.true;
      expect(array).to.deep.eq([3, 2, 1]);
      expect(updates.count, 'update count').to.eq(1);
    });

    test('map', () => {
      const { array } = R.object({ array: [1, 2, 3] });
      using updates = updateCounter(() => {
        array[0];
      });

      const result = array.map((value) => value * 2);
      expect(Array.isArray(result)).to.be.true;
      expect(Object.getPrototypeOf(result)).to.eq(Array.prototype);
      expect(result).to.deep.eq([2, 4, 6]);
      expect(updates.count, 'update count').to.eq(0);
    });

    test('flatMap', () => {
      const { array } = R.object({ array: [1, 2, 3] });
      using updates = updateCounter(() => {
        array[0];
      });

      const result = array.flatMap((value) => [value, value * 2]);
      expect(Array.isArray(result)).to.be.true;
      expect(Object.getPrototypeOf(result)).to.eq(Array.prototype);
      expect(result).to.deep.eq([1, 2, 2, 4, 3, 6]);
      expect(updates.count, 'update count').to.eq(0);
    });

    test('flat', () => {
      const { array } = R.object({ array: [[1], [2, 3]] });
      using updates = updateCounter(() => {
        array[0];
      });

      const result = array.flat();
      expect(Array.isArray(result)).to.be.true;
      expect(Object.getPrototypeOf(result)).to.eq(Array.prototype);
      expect(result).to.deep.eq([1, 2, 3]);
      expect(updates.count, 'update count').to.eq(0);
    });

    test('forEach', () => {
      const { array } = R.object({ array: [1, 2, 3] });
      using updates = updateCounter(() => {
        array[0];
      });

      let sum = 0;
      array.forEach((value) => {
        sum += value;
      });
      expect(sum).to.eq(6);
      expect(updates.count, 'update count').to.eq(0);
    });

    test('spreading', () => {
      const { array } = R.object({ array: [1, 2, 3] });
      using updates = updateCounter(() => {
        array[0];
      });

      const result = [...array];
      expect(Array.isArray(result)).to.be.true;
      expect(Object.getPrototypeOf(result)).to.eq(Array.prototype);
      expect(result).to.deep.eq([1, 2, 3]);
      expect(updates.count, 'update count').to.eq(0);
    });

    test('values', () => {
      const { array } = R.object({ array: [1, 2, 3] });
      using updates = updateCounter(() => {
        array[0];
      });

      const result = array.values();
      expect(result.next().value).to.eq(1);
      expect(result.next().value).to.eq(2);
      expect(result.next().value).to.eq(3);
      expect(result.next().done).to.be.true;
      expect(updates.count, 'update count').to.eq(0);
    });

    test('for loop', () => {
      const { array } = R.object({ array: [1, 2, 3] });
      using updates = updateCounter(() => {
        array[0];
      });

      let sum = 0;
      for (const value of array) {
        sum += value;
      }
      expect(sum).to.eq(6);
      expect(updates.count, 'update count').to.eq(0);
    });
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
  undefined,
  array: [1, 2, 3],
  object: { field: 'bar' },
  classInstance: new MyClass(),
};
