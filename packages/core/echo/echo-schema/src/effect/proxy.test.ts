//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { expect } from 'chai';
import jestExpect from 'expect';
import { inspect } from 'util';

import { registerSignalRuntime } from '@dxos/echo-signals';
import { describe, test } from '@dxos/test';

import { createEchoReactiveObject } from './echo-handler';
import * as R from './reactive';
import { updateCounter } from './testutils';

registerSignalRuntime();

// For testing.
class TestClass {
  field = 'value';

  toJSON() {
    return { field: this.field };
  }
}
const TestNestedSchema = S.mutable(S.struct({ field: S.string }));
const TestSchema = S.mutable(
  S.partial(
    S.struct({
      string: S.string,
      number: S.number,
      boolean: S.boolean,
      null: S.null,
      undefined: S.undefined,
      numberArray: S.mutable(S.array(S.number)),
      twoDimNumberArray: S.mutable(S.array(S.mutable(S.array(S.number)))),
      object: TestNestedSchema,
      objectArray: S.mutable(S.array(TestNestedSchema)),
      classInstance: S.instanceOf(TestClass),
      other: S.any,
    }),
  ),
);
type TestSchema = S.Schema.To<typeof TestSchema>;

test('', () => {});

for (const schema of [undefined]) {
  for (const useDatabase of [true]) {
    const createObject = (props: Partial<TestSchema> = {}): TestSchema => {
      if (useDatabase) {
        // TODO: extract echo-schema into a separate package and export a test suite, use it in echo-database
        return createEchoReactiveObject(props, schema ?? undefined);
      }
      return schema == null ? (R.object(props) as TestSchema) : R.object(schema, props);
    };

    describe.only(`Proxy properties${schema == null ? '' : ' with schema'}`, () => {
      test('object initializer', () => {
        const obj = createObject({ string: 'bar' });
        expect(obj.string).to.eq('bar');

        obj.string = 'baz';
        expect(obj.string).to.eq('baz');
      });

      test('can assign scalar values', () => {
        const obj = createObject();

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
        const obj = createObject();

        obj.object = { field: 'bar' };
        expect(obj.object.field).to.eq('bar');

        obj.object.field = 'baz';
        expect(obj.object.field).to.eq('baz');
      });

      test('can assign class instances', () => {
        const obj = createObject();

        const classInstance = new TestClass();
        obj.classInstance = classInstance;
        expect(obj.classInstance.field).to.eq('value');
        expect(obj.classInstance instanceof TestClass).to.eq(true);
        expect(obj.classInstance === classInstance).to.be.true;

        obj.classInstance.field = 'baz';
        expect(obj.classInstance.field).to.eq('baz');
      });

      test('sub-proxies maintain their identity', () => {
        const obj = createObject();

        obj.object = { field: 'bar' };
        // eslint-disable-next-line no-self-compare
        expect(obj.object === obj.object).to.be.true;
      });

      test('can assign array values', () => {
        const obj = createObject();

        obj.numberArray = [1, 2, 3];
        expect(obj.numberArray).to.deep.eq([1, 2, 3]);

        obj.numberArray[0] = 4;
        expect(obj.numberArray).to.deep.eq([4, 2, 3]);
      });

      test('can assign arrays with objects', () => {
        const obj = createObject();

        obj.objectArray = [{ field: 'bar' }, { field: 'baz' }];
        expect(obj.objectArray[0].field).to.eq('bar');

        obj.objectArray[0].field = 'baz';
        expect(obj.objectArray[0].field).to.eq('baz');

        obj.objectArray[1].field = 'bar';
        expect(obj.objectArray[1].field).to.eq('bar');
      });

      test('can assign arrays with arrays', () => {
        const obj = createObject();

        obj.twoDimNumberArray = [
          [1, 2, 3],
          [4, 5, 6],
        ];
        expect(obj.twoDimNumberArray[0][0]).to.eq(1);

        obj.twoDimNumberArray[0][0] = 4;
        expect(obj.twoDimNumberArray[0][0]).to.eq(4);
      });

      test('array sub-proxies maintain their identity', () => {
        const obj = createObject();

        obj.objectArray = [{ field: 'bar' }];
        // eslint-disable-next-line no-self-compare
        expect(obj.objectArray === obj.objectArray).to.be.true;
      });

      test('assigning another reactive object', () => {
        const obj = createObject();

        const other = createObject({ string: 'bar' });
        obj.other = other;
        expect(obj.other.string).to.eq('bar');

        obj.other.string = 'baz';
        expect(obj.other.string).to.eq('baz');

        other.string = 'qux';
        expect(obj.other.string).to.eq('qux');

        using updates = updateCounter(() => {
          obj.other.string;
        });

        expect(updates.count, 'update count').to.eq(0);
        other.string = 'quux';
        expect(updates.count, 'update count').to.eq(1);

        obj.other = { string: 'bar' };
        expect(obj.other.string).to.eq('bar');
        expect(updates.count, 'update count').to.eq(2);
      });

      test.only('keys enumeration', () => {
        const obj = createObject({ string: 'bar' });

        expect(Object.keys(obj)).to.deep.eq(['string']);

        obj.number = 42;
        expect(Object.keys(obj)).to.deep.eq(['string', 'number']);
      });

      test('has', () => {
        const obj = createObject({ string: 'bar' });
        expect('string' in obj).to.be.true;
        expect('number' in obj).to.be.false;

        obj.number = 42;
        expect('number' in obj).to.be.true;
      });

      test('Array.isArray', () => {
        const obj = createObject({ numberArray: [1, 2, 3] });
        expect(Array.isArray(obj.numberArray)).to.be.true;
      });

      test('instanceof', () => {
        const obj = createObject({ numberArray: [1, 2, 3], object: { field: 'foo' } });

        expect(obj instanceof Object).to.be.true;
        expect(obj instanceof Array).to.be.false;
        expect(obj.numberArray instanceof Object).to.be.true;
        expect(obj.numberArray instanceof Array).to.be.true;
        expect(obj.object instanceof Object).to.be.true;
        expect(obj.object instanceof Array).to.be.false;
      });

      test('inspect', () => {
        const obj = createObject({ string: 'bar' });

        const str = inspect(obj, { colors: false });
        expect(str).to.eq("{ string: 'bar' }");
      });

      test('toString', () => {
        const obj = createObject({ string: 'bar' });
        expect(obj.toString()).to.eq('[object Object]'); // TODO(dmaretskyi): Change to `[object ECHO]`?
      });

      test('toJSON', () => {
        const obj = createObject({ ...TEST_OBJECT });
        expect(JSON.stringify(obj)).to.eq(JSON.stringify(TEST_OBJECT));
      });

      test('chai deep equal works', () => {
        const obj = createObject({ ...TEST_OBJECT });

        expect(obj).to.deep.eq(TEST_OBJECT);
        expect(obj).to.not.deep.eq({ ...TEST_OBJECT, number: 11 });
      });

      test('jest deep equal works', () => {
        const obj = createObject({ ...TEST_OBJECT });

        jestExpect(obj).toEqual(TEST_OBJECT);
        jestExpect(obj).not.toEqual({ ...TEST_OBJECT, number: 11 });
      });

      // Not a typical use case, but might come up when interacting with 3rd party libraries.
      test('defineProperty', () => {
        const obj = createObject();
        using updates = updateCounter(() => {
          obj.string;
        });

        Object.defineProperty(obj, 'string', { value: 'bar' });
        expect(obj.string).to.eq('bar');
        expect(updates.count, 'update count').to.eq(1);
      });

      test('getOwnPropertyDescriptor', () => {
        const obj = createObject({ string: 'bar' });
        const descriptor = Object.getOwnPropertyDescriptor(obj, 'string');

        expect(descriptor).to.deep.eq({
          value: 'bar',
          writable: true,
          enumerable: true,
          configurable: true,
        });
      });

      describe('signal updates', () => {
        test('are synchronous', () => {
          const obj = createObject({ string: 'bar' });

          using updates = updateCounter(() => {
            obj.string;
          });
          expect(updates.count, 'update count').to.eq(0);

          obj.string = 'baz';
          expect(updates.count, 'update count').to.eq(1);
        });

        test('in nested objects', () => {
          const obj = createObject({ object: { field: 'bar' } });

          using updates = updateCounter(() => {
            obj.object!.field;
          });
          expect(updates.count, 'update count').to.eq(0);

          obj.object!.field = 'baz';
          expect(updates.count, 'update count').to.eq(1);
        });

        test('not in nested class instances', () => {
          const obj = createObject({ classInstance: new TestClass() });

          using updates = updateCounter(() => {
            obj.classInstance!.field;
          });
          expect(updates.count, 'update count').to.eq(0);

          obj.classInstance!.field = 'baz';
          expect(updates.count, 'update count').to.eq(0);
        });

        test('in nested arrays', () => {
          const obj = createObject({ numberArray: [7] });

          using updates = updateCounter(() => {
            obj.numberArray![0];
          });
          expect(updates.count, 'update count').to.eq(0);

          obj.numberArray![0] = 42;
          expect(updates.count, 'update count').to.eq(1);
        });

        test('in nested arrays with objects', () => {
          const obj = createObject({ objectArray: [{ field: 'bar' }] });

          using updates = updateCounter(() => {
            obj.objectArray![0].field;
          });
          expect(updates.count, 'update count').to.eq(0);

          obj.objectArray![0].field = 'baz';
          expect(updates.count, 'update count').to.eq(1);
        });

        test('in nested arrays with arrays', () => {
          const obj = createObject({ twoDimNumberArray: [[1, 2, 3]] });

          using updates = updateCounter(() => {
            obj.twoDimNumberArray![0][0];
          });
          expect(updates.count, 'update count').to.eq(0);

          obj.twoDimNumberArray![0][0] = 4;
          expect(updates.count, 'update count').to.eq(1);
        });
      });

      describe('array operations', () => {
        const createReactiveArray = (numberArray: number[]): number[] => {
          const obj = createObject({ numberArray });
          return obj.numberArray!;
        };

        test('set by index', () => {
          const array = createReactiveArray([1, 2, 3]);
          using updates = updateCounter(() => {
            array[0];
          });

          array[0] = 2;
          expect(array[0]).to.eq(2);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('length', () => {
          const array = createReactiveArray([1, 2, 3]);
          using updates = updateCounter(() => {
            array[0];
          });
          expect(array.length).to.eq(3);

          array.push(4);
          expect(array.length).to.eq(4);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('set length', () => {
          const array = createReactiveArray([1, 2, 3]);
          using updates = updateCounter(() => {
            array[0];
          });

          array.length = 2;
          expect(array.length).to.eq(2);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('push', () => {
          const array = createReactiveArray([1, 2, 3]);
          using updates = updateCounter(() => {
            array[0];
          });

          array.push(4);
          expect(array).to.deep.eq([1, 2, 3, 4]);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('pop', () => {
          const array = createReactiveArray([1, 2, 3]);
          using updates = updateCounter(() => {
            array[0];
          });

          const value = array.pop();
          expect(value).to.eq(3);
          expect(array).to.deep.eq([1, 2]);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('shift', () => {
          const array = createReactiveArray([1, 2, 3]);
          using updates = updateCounter(() => {
            array[0];
          });

          const value = array.shift();
          expect(value).to.eq(1);
          expect(array).to.deep.eq([2, 3]);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('unshift', () => {
          const array = createReactiveArray([1, 2, 3]);
          using updates = updateCounter(() => {
            array[0];
          });

          const newLength = array.unshift(0);
          expect(newLength).to.eq(4);
          expect(array).to.deep.eq([0, 1, 2, 3]);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('splice', () => {
          const array = createReactiveArray([1, 2, 3]);
          using updates = updateCounter(() => {
            array[0];
          });

          const removed = array.splice(1, 1, 4);
          expect(removed).to.deep.eq([2]);
          expect(array).to.deep.eq([1, 4, 3]);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('sort', () => {
          const array = createReactiveArray([3, 2, 1]);
          using updates = updateCounter(() => {
            array[0];
          });

          const returnValue = array.sort();
          expect(returnValue === array).to.be.true;
          expect(array).to.deep.eq([1, 2, 3]);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('reverse', () => {
          const array = createReactiveArray([1, 2, 3]);
          using updates = updateCounter(() => {
            array[0];
          });

          const returnValue = array.reverse();
          expect(returnValue === array).to.be.true;
          expect(array).to.deep.eq([3, 2, 1]);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('map', () => {
          const array = createReactiveArray([1, 2, 3]);
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
          const array = createReactiveArray([1, 2, 3]);
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
          const obj = createObject({ twoDimNumberArray: [[1], [2, 3]] });
          const array = obj.twoDimNumberArray!;
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
          const array = createReactiveArray([1, 2, 3]);
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
          const array = createReactiveArray([1, 2, 3]);
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
          const array = createReactiveArray([1, 2, 3]);
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
          const array = createReactiveArray([1, 2, 3]);
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
  }
}

const TEST_OBJECT: TestSchema = {
  string: 'foo',
  number: 42,
  boolean: true,
  null: null,
  undefined,
  numberArray: [1, 2, 3],
  object: { field: 'bar' },
  classInstance: new TestClass(),
};
