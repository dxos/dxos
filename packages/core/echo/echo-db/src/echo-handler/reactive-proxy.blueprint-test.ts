// Copyright 2024 DXOS.org
//

import { type Schema } from 'effect';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { getTypeReference, getSchema, getType } from '@dxos/echo-schema';
import { Testing, updateCounter } from '@dxos/echo-schema/testing';
import { registerSignalsRuntime } from '@dxos/echo-signals';
import { getProxyHandler } from '@dxos/live-object';
import { log } from '@dxos/log';

registerSignalsRuntime();

const TEST_OBJECT: Testing.TestSchema = {
  string: 'foo',
  number: 42,
  boolean: true,
  null: null,
  stringArray: ['1', '2', '3'],
  object: { field: 'bar' },
};

// TODO(dmaretskyi): Come up with a test fixture pattern?
export interface TestConfiguration {
  objectsHaveId: boolean;
  /**
   * Whether to test assigning objects to properties in other objects.
   * @default true
   */
  allowObjectAssignments?: boolean;
  beforeAllCb?: () => Promise<void>;
  afterAllCb?: () => Promise<void>;
  createObjectFn: (props?: Partial<Testing.TestSchema>) => Promise<Testing.TestSchema>;
}

export type TestConfigurationFactory = (schema: Schema.Schema.AnyNoContext | undefined) => TestConfiguration | null;

export const reactiveProxyTests = (testConfigFactory: TestConfigurationFactory): void => {
  for (const schema of [undefined, Testing.TestSchema, Testing.TestSchemaType]) {
    const testConfig = testConfigFactory(schema);
    if (testConfig == null) {
      continue;
    }

    const {
      objectsHaveId,
      beforeAllCb,
      afterAllCb,
      createObjectFn: createObject,
      allowObjectAssignments = true,
    } = testConfig;

    beforeAll(async () => {
      await beforeAllCb?.();
    });

    afterAll(async () => {
      await afterAllCb?.();
    });

    describe(`Proxy properties(schema=${schema != null})`, () => {
      test('handler type', async () => {
        const obj = await createObject();
        log('handler', { handler: Object.getPrototypeOf(getProxyHandler(obj)).constructor.name });
      });

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

        const plainObject = { field: 'bar' };
        obj.object = plainObject;
        expect(obj.object.field).to.eq('bar');

        expect(obj.object).to.deep.eq(plainObject);

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

        obj.stringArray = ['1', '2', '3'];
        expect(obj.stringArray).to.deep.eq(['1', '2', '3']);

        obj.stringArray[0] = '4';
        expect(obj.stringArray).to.deep.eq(['4', '2', '3']);
      });

      test('can work with complex types', async () => {
        const circle: any = { type: 'circle', radius: 42 };
        const obj = await createObject({ nullableShapeArray: [circle] });
        expect(obj.nullableShapeArray![0]).to.deep.eq(circle);

        obj.nullableShapeArray?.push(null);
        expect(obj.nullableShapeArray).to.deep.eq([circle, null]);

        const square: any = { type: 'square', side: 24 };
        obj.nullableShapeArray?.push(square);
        expect(obj.nullableShapeArray).to.deep.eq([circle, null, square]);

        (obj.nullableShapeArray![2] as any).side = 33;
        expect((obj.nullableShapeArray![2] as any).side).to.eq(33);
      });

      test('validation failures', async () => {
        if (schema == null) {
          return;
        }

        const obj = await createObject({ objectArray: [{ field: 'foo' }] });
        expect(() => (obj.string = 1 as any)).to.throw();
        expect(() => (obj.object = { field: 1 } as any)).to.throw();
        obj.object = { field: 'bar' };
        expect(() => (obj.object!.field = 1 as any)).to.throw();
        expect(() => obj.objectArray?.push({ field: 1 } as any)).to.throw();
        expect(() => obj.objectArray?.unshift({ field: 1 } as any)).to.throw();
        expect(() => (obj.objectArray![0] = { field: 1 } as any)).to.throw();
        expect(() => (obj.objectArray![0].field = 1 as any)).to.throw();
        obj.objectArray?.push({ field: 'bar' });
        expect(() => obj.objectArray?.splice(1, 0, { field: 1 } as any)).to.throw();
        expect(() => (obj.objectArray![1].field = 1 as any)).to.throw();
      });

      test('getTypeReference', async () => {
        const obj = await createObject({ number: 42 });
        expect(getType(obj)?.toString()).to.deep.eq(getTypeReference(getSchema(obj))?.toDXN().toString());
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

      test.skipIf(!allowObjectAssignments)('assigning another reactive object', async () => {
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
        expect(Object.keys(obj)).to.deep.eq(objectsHaveId ? ['string', 'id'] : ['string']);

        obj.number = 42;
        expect(Object.keys(obj)).to.deep.eq(objectsHaveId ? ['string', 'number', 'id'] : ['string', 'number']);
      });

      test('has', async () => {
        const obj = await createObject({ string: 'bar' });
        expect('string' in obj).to.be.true;
        expect('number' in obj).to.be.false;

        obj.number = 42;
        expect('number' in obj).to.be.true;
      });

      test('Array.isArray', async () => {
        const obj = await createObject({ stringArray: ['1', '2', '3'] });
        expect(Array.isArray(obj.stringArray)).to.be.true;
      });

      test('instanceof', async () => {
        const obj = await createObject({ stringArray: ['1', '2', '3'], object: { field: 'foo' } });
        expect(obj instanceof Object).to.be.true;
        expect(obj instanceof Array).to.be.false;
        expect(obj.stringArray instanceof Object).to.be.true;
        expect(obj.stringArray instanceof Array).to.be.true;
        expect(obj.object instanceof Object).to.be.true;
        expect(obj.object instanceof Array).to.be.false;
      });

      test('toString', async () => {
        const obj = await createObject({ string: 'bar' });
        expect(obj.toString()).to.eq('[object Object]'); // TODO(dmaretskyi): Change to `[object ECHO]`?
      });

      test('object spreading', async () => {
        const obj = await createObject({ ...TEST_OBJECT });
        if (!objectsHaveId) {
          expect({ ...obj }).to.deep.eq({ ...TEST_OBJECT });
        } else {
          expect({ ...obj }).to.deep.eq({ id: (obj as any).id, ...TEST_OBJECT });
        }
      });

      test('toJSON', async () => {
        const obj = await createObject({ ...TEST_OBJECT });
        const expected = JSON.parse(JSON.stringify(TEST_OBJECT));
        const actual = JSON.parse(JSON.stringify(obj));

        if (!objectsHaveId) {
          expect(actual).to.deep.eq(expected);
        } else {
          expect(actual).to.deep.contain({ id: (obj as any).id, ...expected });
        }
      });

      test('chai deep equal works', async () => {
        const obj = await createObject({ ...TEST_OBJECT });
        const expected = objectsHaveId ? { id: (obj as any).id, ...TEST_OBJECT } : TEST_OBJECT;
        expect(obj).to.deep.eq(expected);
        expect(obj).to.not.deep.eq({ ...expected, number: 11 });
      });

      test('jest deep equal works', async () => {
        const obj = await createObject({ ...TEST_OBJECT });
        const expected = objectsHaveId ? { id: (obj as any).id, ...TEST_OBJECT } : TEST_OBJECT;
        expect(obj).toEqual(expected);
        expect(obj).not.toEqual({ ...expected, number: 11 });
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

      test('delete property', async () => {
        const obj = await createObject({
          string: 'bar',
          number: 42,
          stringArray: ['1', '2', '3'],
          other: { first: 1, second: 2 },
        });
        expect(obj.string).to.eq('bar');
        expect(obj.number).to.eq(42);

        delete obj.string;
        expect(obj.string).to.be.undefined;
        delete obj.number;
        expect(obj.number).to.be.undefined;
        delete obj.stringArray;
        expect(obj.stringArray).to.be.undefined;
        delete obj.other.first;
        expect(obj.other.first).to.be.undefined;
        expect(obj.other).to.deep.eq({ second: 2 });
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
            obj.object!.field; // TODO(burdon): Better way to demonstrate this? E.g., log?
          });
          expect(updates.count, 'update count').to.eq(0);

          obj.object!.field = 'baz';
          expect(updates.count, 'update count').to.eq(1);
        });

        test('in nested arrays', async () => {
          const obj = await createObject({ stringArray: ['7'] });
          using updates = updateCounter(() => {
            obj.stringArray![0];
          });
          expect(updates.count, 'update count').to.eq(0);

          obj.stringArray![0] = '42';
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

        test('Object.keys', async () => {
          const obj = await createObject({ number: 42 });
          using updates = updateCounter(() => {
            Object.keys(obj);
          });
          expect(updates.count).to.eq(0);

          obj.string = 'foo';
          expect(updates.count).to.eq(1);

          obj.boolean = false;
          expect(updates.count).to.eq(2);
        });
      });

      describe('array operations', () => {
        const createReactiveArray = async (stringArray: string[]): Promise<string[]> => {
          const obj = await createObject({ stringArray });
          return obj.stringArray!;
        };

        test('set by index', async () => {
          const array = await createReactiveArray(['1', '2', '3']);
          using updates = updateCounter(() => {
            array[0];
          });

          array[0] = '2';
          expect(array[0]).to.eq('2');
          expect(updates.count, 'update count').to.eq(1);
        });

        test('length', async () => {
          const array = await createReactiveArray(['1', '2', '3']);
          using updates = updateCounter(() => {
            array[0];
          });
          expect(array.length).to.eq(3);

          array.push('4');
          expect(array.length).to.eq(4);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('set length', async () => {
          const array = await createReactiveArray(['1', '2', '3']);
          using updates = updateCounter(() => {
            array[0];
          });

          array.length = 2;
          expect(array.length).to.eq(2);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('push', async () => {
          const array = await createReactiveArray(['1', '2', '3']);
          using updates = updateCounter(() => {
            array[0];
          });

          array.push('4');
          expect(array).to.deep.eq(['1', '2', '3', '4']);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('pop', async () => {
          const array = await createReactiveArray(['1', '2', '3']);
          using updates = updateCounter(() => {
            array[0];
          });

          const value = array.pop();
          expect(value).to.eq('3');
          expect(array).to.deep.eq(['1', '2']);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('shift', async () => {
          const array = await createReactiveArray(['1', '2', '3']);
          using updates = updateCounter(() => {
            array[0];
          });

          const value = array.shift();
          expect(value).to.eq('1');
          expect(array).to.deep.eq(['2', '3']);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('unshift', async () => {
          const array = await createReactiveArray(['1', '2', '3']);
          using updates = updateCounter(() => {
            array[0];
          });

          const newLength = array.unshift('0');
          expect(newLength).to.eq(4);
          expect(array).to.deep.eq(['0', '1', '2', '3']);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('splice', async () => {
          const array = await createReactiveArray(['1', '2', '3']);
          using updates = updateCounter(() => {
            array[0];
          });

          const removed = array.splice(1, 1, '4');
          expect(removed).to.deep.eq(['2']);
          expect(array).to.deep.eq(['1', '4', '3']);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('sort', async () => {
          const array = await createReactiveArray(['3', '2', '1']);
          using updates = updateCounter(() => {
            array[0];
          });

          const returnValue = array.sort();
          expect(returnValue === array).to.be.true;
          expect(array).to.deep.eq(['1', '2', '3']);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('filter', async () => {
          const array = await createReactiveArray(['1', '2', '3']);
          const returnValue = array.filter((v) => Number(v) & 1);
          expect(returnValue).to.deep.eq(['1', '3']);
        });

        test('reverse', async () => {
          const array = await createReactiveArray(['1', '2', '3']);
          using updates = updateCounter(() => {
            array[0];
          });

          const returnValue = array.reverse();
          expect(returnValue === array).to.be.true;
          expect(array).to.deep.eq(['3', '2', '1']);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('map', async () => {
          const array = await createReactiveArray(['1', '2', '3']);
          using updates = updateCounter(() => {
            array[0];
          });

          const result = array.map((value) => String(Number(value) * 2));
          expect(Array.isArray(result)).to.be.true;
          expect(Object.getPrototypeOf(result)).to.eq(Array.prototype);
          expect(result).to.deep.eq(['2', '4', '6']);
          expect(updates.count, 'update count').to.eq(0);
        });

        test('flatMap', async () => {
          const array = await createReactiveArray(['1', '2', '3']);
          using updates = updateCounter(() => {
            array[0];
          });

          const result = array.flatMap((value) => [value, String(Number(value) * 2)]);
          expect(Array.isArray(result)).to.be.true;
          expect(Object.getPrototypeOf(result)).to.eq(Array.prototype);
          expect(result).to.deep.eq(['1', '2', '2', '4', '3', '6']);
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
          const array = await createReactiveArray(['1', '2', '3']);
          using updates = updateCounter(() => {
            array[0];
          });

          let sum = 0;
          array.forEach((value) => {
            sum += Number(value);
          });
          expect(sum).to.eq(6);
          expect(updates.count, 'update count').to.eq(0);
        });

        test('spreading', async () => {
          const array = await createReactiveArray(['1', '2', '3']);
          using updates = updateCounter(() => {
            array[0];
          });

          const result = [...array];
          expect(Array.isArray(result)).to.be.true;
          expect(Object.getPrototypeOf(result)).to.eq(Array.prototype);
          expect(result).to.deep.eq(['1', '2', '3']);
          expect(updates.count, 'update count').to.eq(0);
        });

        test('values', async () => {
          const array = await createReactiveArray(['1', '2', '3']);
          using updates = updateCounter(() => {
            array[0];
          });

          const result = array.values();
          expect(result.next().value).to.eq('1');
          expect(result.next().value).to.eq('2');
          expect(result.next().value).to.eq('3');
          expect(result.next().done).to.be.true;
          expect(updates.count, 'update count').to.eq(0);
        });

        test('for loop', async () => {
          const array = await createReactiveArray(['1', '2', '3']);
          using updates = updateCounter(() => {
            array[0];
          });

          let sum = 0;
          for (const value of array) {
            sum += Number(value);
          }
          expect(sum).to.eq(6);
          expect(updates.count, 'update count').to.eq(0);
        });
      });
    });
  }
};
