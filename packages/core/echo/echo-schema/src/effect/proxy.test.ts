//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import jestExpect from 'expect';

import { registerSignalRuntime } from '@dxos/echo-signals';
import { describe, test } from '@dxos/test';

import * as R from './reactive';
import { TestSchema } from './testing/schema';
import { updateCounter } from './testutils';
import { Hypergraph } from '../hypergraph';
import { createDatabase } from '../testing';

registerSignalRuntime();

for (const schema of [undefined, TestSchema]) {
  for (const useDatabase of [false, true]) {
    const testSetup = useDatabase ? createDatabase(new Hypergraph(), { useReactiveObjectApi: true }) : undefined;
    const createObject = async (props: Partial<TestSchema> = {}): Promise<TestSchema> => {
      const testSchema = useDatabase && schema ? schema.pipe(R.echoObject('TestSchema', '1.0.0')) : schema;
      const obj = testSchema == null ? (R.object(props) as TestSchema) : R.object(testSchema, props);
      if (!useDatabase) {
        return obj;
      }
      const { db, graph } = await testSetup!;
      if (testSchema && !graph.types.isEffectSchemaRegistered(testSchema)) {
        graph.types.registerEffectSchema(testSchema);
      }
      return db.add(obj);
    };

    // TODO(dmaretskyi): Remove.
    if (!schema || useDatabase) {
      continue;
    }

    describe(`Proxy properties${schema == null ? '' : ' with schema'}`, () => {
      test('object initializer', async () => {
        const obj = await createObject({ string: 'bar' });
        expect(obj.string).to.eq('bar');

        obj.string = 'baz';
        expect(obj.string).to.eq('baz');
      });

      test('can assign scalar values', async () => {
        const obj = await createObject();

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

      test('can assign object values', async () => {
        const obj = await createObject();

        obj.object = { field: 'bar' };
        expect(obj.object.field).to.eq('bar');

        obj.object.field = 'baz';
        expect(obj.object.field).to.eq('baz');
      });

      test('sub-proxies maintain their identity', async () => {
        const obj = await createObject();

        obj.object = { field: 'bar' };
        // eslint-disable-next-line no-self-compare
        expect(obj.object === obj.object).to.be.true;
      });

      test('can assign array values', async () => {
        const obj = await createObject();

        obj.numberArray = [1, 2, 3];
        expect(obj.numberArray).to.deep.eq([1, 2, 3]);

        obj.numberArray[0] = 4;
        expect(obj.numberArray).to.deep.eq([4, 2, 3]);
      });

      test('can assign arrays with objects', async () => {
        const obj = await createObject();

        obj.objectArray = [{ field: 'bar' }, { field: 'baz' }];
        expect(obj.objectArray[0].field).to.eq('bar');

        obj.objectArray[0].field = 'baz';
        expect(obj.objectArray[0].field).to.eq('baz');

        obj.objectArray[1].field = 'bar';
        expect(obj.objectArray[1].field).to.eq('bar');
      });

      test('can assign arrays with arrays', async () => {
        const obj = await createObject();

        obj.twoDimNumberArray = [
          [1, 2, 3],
          [4, 5, 6],
        ];
        expect(obj.twoDimNumberArray[0][0]).to.eq(1);

        obj.twoDimNumberArray[0][0] = 4;
        expect(obj.twoDimNumberArray[0][0]).to.eq(4);
      });

      test('array sub-proxies maintain their identity', async () => {
        const obj = await createObject();

        obj.objectArray = [{ field: 'bar' }];
        // eslint-disable-next-line no-self-compare
        expect(obj.objectArray === obj.objectArray).to.be.true;
      });

      test('assigning another reactive object', async () => {
        const obj = await createObject();

        const other = await createObject({ string: 'bar' });
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

      test('keys enumeration', async () => {
        const obj = await createObject({ string: 'bar' });

        expect(Object.keys(obj)).to.deep.eq(['string']);

        obj.number = 42;
        expect(Object.keys(obj)).to.deep.eq(['string', 'number']);
      });

      test('has', async () => {
        const obj = await createObject({ string: 'bar' });
        expect('string' in obj).to.be.true;
        expect('number' in obj).to.be.false;

        obj.number = 42;
        expect('number' in obj).to.be.true;
      });

      test('Array.isArray', async () => {
        const obj = await createObject({ numberArray: [1, 2, 3] });
        expect(Array.isArray(obj.numberArray)).to.be.true;
      });

      test('instanceof', async () => {
        const obj = await createObject({ numberArray: [1, 2, 3], object: { field: 'foo' } });

        expect(obj instanceof Object).to.be.true;
        expect(obj instanceof Array).to.be.false;
        expect(obj.numberArray instanceof Object).to.be.true;
        expect(obj.numberArray instanceof Array).to.be.true;
        expect(obj.object instanceof Object).to.be.true;
        expect(obj.object instanceof Array).to.be.false;
      });

      test('toString', async () => {
        const obj = await createObject({ string: 'bar' });
        expect(obj.toString()).to.eq('[object Object]'); // TODO(dmaretskyi): Change to `[object ECHO]`?
      });

      test('object spreading', async () => {
        const obj = await createObject({ ...TEST_OBJECT });
        expect({ ...obj }).to.deep.eq({ ...TEST_OBJECT });
      });

      test('toJSON', async () => {
        const obj = await createObject({ ...TEST_OBJECT });
        const expected = JSON.parse(JSON.stringify(TEST_OBJECT));
        const actual = JSON.parse(JSON.stringify(obj));
        expect(actual).to.deep.eq(expected);
      });

      test('chai deep equal works', async () => {
        const obj = await createObject({ ...TEST_OBJECT });

        expect(obj).to.deep.eq(TEST_OBJECT);
        expect(obj).to.not.deep.eq({ ...TEST_OBJECT, number: 11 });
      });

      test('jest deep equal works', async () => {
        const obj = await createObject({ ...TEST_OBJECT });

        jestExpect(obj).toEqual(TEST_OBJECT);
        jestExpect(obj).not.toEqual({ ...TEST_OBJECT, number: 11 });
      });

      // Not a typical use case, but might come up when interacting with 3rd party libraries.
      test('defineProperty', async () => {
        const obj = await createObject();
        using updates = updateCounter(() => {
          obj.string;
        });

        Object.defineProperty(obj, 'string', { value: 'bar' });
        expect(obj.string).to.eq('bar');
        expect(updates.count, 'update count').to.eq(1);
      });

      test('getOwnPropertyDescriptor', async () => {
        const obj = await createObject({ string: 'bar' });
        const descriptor = Object.getOwnPropertyDescriptor(obj, 'string');

        expect(descriptor).to.deep.eq({
          value: 'bar',
          writable: true,
          enumerable: true,
          configurable: true,
        });
      });

      describe('signal updates', () => {
        test('are synchronous', async () => {
          const obj = await createObject({ string: 'bar' });

          using updates = updateCounter(() => {
            obj.string;
          });
          expect(updates.count, 'update count').to.eq(0);

          obj.string = 'baz';
          expect(updates.count, 'update count').to.eq(1);
        });

        test('in nested objects', async () => {
          const obj = await createObject({ object: { field: 'bar' } });

          using updates = updateCounter(() => {
            obj.object!.field;
          });
          expect(updates.count, 'update count').to.eq(0);

          obj.object!.field = 'baz';
          expect(updates.count, 'update count').to.eq(1);
        });

        test('in nested arrays', async () => {
          const obj = await createObject({ numberArray: [7] });

          using updates = updateCounter(() => {
            obj.numberArray![0];
          });
          expect(updates.count, 'update count').to.eq(0);

          obj.numberArray![0] = 42;
          expect(updates.count, 'update count').to.eq(1);
        });

        test('in nested arrays with objects', async () => {
          const obj = await createObject({ objectArray: [{ field: 'bar' }] });

          using updates = updateCounter(() => {
            obj.objectArray![0].field;
          });
          expect(updates.count, 'update count').to.eq(0);

          obj.objectArray![0].field = 'baz';
          expect(updates.count, 'update count').to.eq(1);
        });

        test('in nested arrays with arrays', async () => {
          const obj = await createObject({ twoDimNumberArray: [[1, 2, 3]] });

          using updates = updateCounter(() => {
            obj.twoDimNumberArray![0][0];
          });
          expect(updates.count, 'update count').to.eq(0);

          obj.twoDimNumberArray![0][0] = 4;
          expect(updates.count, 'update count').to.eq(1);
        });
      });

      describe('array operations', () => {
        const createReactiveArray = async (numberArray: number[]): Promise<number[]> => {
          const obj = await createObject({ numberArray });
          return obj.numberArray!;
        };

        test('set by index', async () => {
          const array = await createReactiveArray([1, 2, 3]);
          using updates = updateCounter(() => {
            array[0];
          });

          array[0] = 2;
          expect(array[0]).to.eq(2);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('length', async () => {
          const array = await createReactiveArray([1, 2, 3]);
          using updates = updateCounter(() => {
            array[0];
          });
          expect(array.length).to.eq(3);

          array.push(4);
          expect(array.length).to.eq(4);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('set length', async () => {
          const array = await createReactiveArray([1, 2, 3]);
          using updates = updateCounter(() => {
            array[0];
          });

          array.length = 2;
          expect(array.length).to.eq(2);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('push', async () => {
          const array = await createReactiveArray([1, 2, 3]);
          using updates = updateCounter(() => {
            array[0];
          });

          array.push(4);
          expect(array).to.deep.eq([1, 2, 3, 4]);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('pop', async () => {
          const array = await createReactiveArray([1, 2, 3]);
          using updates = updateCounter(() => {
            array[0];
          });

          const value = array.pop();
          expect(value).to.eq(3);
          expect(array).to.deep.eq([1, 2]);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('shift', async () => {
          const array = await createReactiveArray([1, 2, 3]);
          using updates = updateCounter(() => {
            array[0];
          });

          const value = array.shift();
          expect(value).to.eq(1);
          expect(array).to.deep.eq([2, 3]);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('unshift', async () => {
          const array = await createReactiveArray([1, 2, 3]);
          using updates = updateCounter(() => {
            array[0];
          });

          const newLength = array.unshift(0);
          expect(newLength).to.eq(4);
          expect(array).to.deep.eq([0, 1, 2, 3]);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('splice', async () => {
          const array = await createReactiveArray([1, 2, 3]);
          using updates = updateCounter(() => {
            array[0];
          });

          const removed = array.splice(1, 1, 4);
          expect(removed).to.deep.eq([2]);
          expect(array).to.deep.eq([1, 4, 3]);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('sort', async () => {
          const array = await createReactiveArray([3, 2, 1]);
          using updates = updateCounter(() => {
            array[0];
          });

          const returnValue = array.sort();
          expect(returnValue === array).to.be.true;
          expect(array).to.deep.eq([1, 2, 3]);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('filter', async () => {
          const array = await createReactiveArray([1, 2, 3]);
          const returnValue = array.filter((v) => v & 1);
          expect(returnValue).to.deep.eq([1, 3]);
        });

        test('reverse', async () => {
          const array = await createReactiveArray([1, 2, 3]);
          using updates = updateCounter(() => {
            array[0];
          });

          const returnValue = array.reverse();
          expect(returnValue === array).to.be.true;
          expect(array).to.deep.eq([3, 2, 1]);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('map', async () => {
          const array = await createReactiveArray([1, 2, 3]);
          using updates = updateCounter(() => {
            array[0];
          });

          const result = array.map((value) => value * 2);
          expect(Array.isArray(result)).to.be.true;
          expect(Object.getPrototypeOf(result)).to.eq(Array.prototype);
          expect(result).to.deep.eq([2, 4, 6]);
          expect(updates.count, 'update count').to.eq(0);
        });

        test('flatMap', async () => {
          const array = await createReactiveArray([1, 2, 3]);
          using updates = updateCounter(() => {
            array[0];
          });

          const result = array.flatMap((value) => [value, value * 2]);
          expect(Array.isArray(result)).to.be.true;
          expect(Object.getPrototypeOf(result)).to.eq(Array.prototype);
          expect(result).to.deep.eq([1, 2, 2, 4, 3, 6]);
          expect(updates.count, 'update count').to.eq(0);
        });

        test('flat', async () => {
          const obj = await createObject({ twoDimNumberArray: [[1], [2, 3]] });
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

        test('forEach', async () => {
          const array = await createReactiveArray([1, 2, 3]);
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

        test('spreading', async () => {
          const array = await createReactiveArray([1, 2, 3]);
          using updates = updateCounter(() => {
            array[0];
          });

          const result = [...array];
          expect(Array.isArray(result)).to.be.true;
          expect(Object.getPrototypeOf(result)).to.eq(Array.prototype);
          expect(result).to.deep.eq([1, 2, 3]);
          expect(updates.count, 'update count').to.eq(0);
        });

        test('values', async () => {
          const array = await createReactiveArray([1, 2, 3]);
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

        test('for loop', async () => {
          const array = await createReactiveArray([1, 2, 3]);
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
  numberArray: [1, 2, 3],
  object: { field: 'bar' },
};
