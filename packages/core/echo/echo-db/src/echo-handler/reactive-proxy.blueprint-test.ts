//
// Copyright 2024 DXOS.org
//

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { Obj, Type } from '@dxos/echo';
import { getSchemaDXN } from '@dxos/echo/internal';
import { getProxyHandler } from '@dxos/echo/internal';
import { TestSchema, updateCounter } from '@dxos/echo/testing';
import { log } from '@dxos/log';

const TEST_OBJECT: TestSchema.ExampleSchema = {
  string: 'foo',
  number: 42,
  boolean: true,
  null: null,
  stringArray: ['1', '2', '3'],
  nested: {
    field: 'bar',
  },
};

// TODO(dmaretskyi): Come up with a test fixture pattern?
export interface TestConfiguration {
  objectsHaveId: boolean;
  beforeAllCb?: () => Promise<void>;
  afterAllCb?: () => Promise<void>;
  createObjectFn: (props?: Partial<TestSchema.Example>) => Promise<TestSchema.Example>;
}

export type TestConfigurationFactory = (schema: Type.Obj.Any) => TestConfiguration | null;

/**
 * Helper to wrap mutations. All ECHO objects require Obj.change for mutations.
 */
const change = <T>(obj: T, callback: (o: Obj.Mutable<T>) => void): void => {
  Obj.change(obj as any, callback as any);
};

export const reactiveProxyTests = (testConfigFactory: TestConfigurationFactory): void => {
  for (const schema of [TestSchema.Expando, TestSchema.Example]) {
    const testConfig = testConfigFactory(schema);
    if (testConfig == null) {
      continue;
    }

    const { objectsHaveId, beforeAllCb, afterAllCb, createObjectFn: createObject } = testConfig;

    beforeAll(async () => {
      await beforeAllCb?.();
    });

    afterAll(async () => {
      await afterAllCb?.();
    });

    describe(`Proxy properties(schema=${Type.getTypename(schema)})`, () => {
      test('handler type', async () => {
        const obj = await createObject();
        log('handler', { handler: Object.getPrototypeOf(getProxyHandler(obj)).constructor.name });
      });

      test('object initializer', async () => {
        const obj = await createObject({ string: 'bar' });
        expect(obj.string).to.eq('bar');

        change(obj, (o) => {
          o.string = 'baz';
        });
        expect(obj.string).to.eq('baz');
      });

      test('can assign scalar values', async () => {
        const obj = await createObject();

        change(obj, (o) => {
          o.string = 'foo';
          o.number = 42;
          o.boolean = true;
          o.null = null;
          o.undefined = undefined;
        });

        expect(obj.string).to.eq('foo');
        expect(obj.number).to.eq(42);
        expect(obj.boolean).to.eq(true);
        expect(obj.null).to.eq(null);
        expect(obj.undefined).to.eq(undefined);
      });

      test('can assign object values', async () => {
        const obj = await createObject();

        const plainObject = { field: 'bar' };
        change(obj, (o) => {
          o.nested = plainObject;
        });
        expect(obj.nested!.field).to.eq('bar');
        expect(obj.nested!).to.deep.eq(plainObject);

        change(obj, (o) => {
          o.nested!.field = 'baz';
        });
        expect(obj.nested!.field).to.eq('baz');
      });

      test('sub-proxies maintain their identity', async () => {
        const obj = await createObject();

        change(obj, (o) => {
          o.nested = { field: 'bar' };
        });
        expect(obj.nested === obj.nested).to.be.true;
      });

      test('can assign array values', async () => {
        const obj = await createObject();

        change(obj, (o) => {
          o.stringArray = ['1', '2', '3'];
        });
        expect(obj.stringArray).to.deep.eq(['1', '2', '3']);

        change(obj, (o) => {
          o.stringArray![0] = '4';
        });
        expect(obj.stringArray).to.deep.eq(['4', '2', '3']);
      });

      test('can work with complex types', async () => {
        const circle: any = { field: 'circle' };
        const obj = await createObject({ nestedNullableArray: [circle] });
        expect(obj.nestedNullableArray![0]).to.deep.eq(circle);

        change(obj, (o) => {
          o.nestedNullableArray?.push(null);
        });
        expect(obj.nestedNullableArray).to.deep.eq([circle, null]);

        const square: any = { field: 'square' };
        change(obj, (o) => {
          o.nestedNullableArray?.push(square);
        });
        expect(obj.nestedNullableArray).to.deep.eq([circle, null, square]);

        change(obj, (o) => {
          (o.nestedNullableArray![2] as any).field = 'rectangle';
        });
        expect((obj.nestedNullableArray![2] as any).field).to.eq('rectangle');
      });

      test('validation failures', async (ctx) => {
        if (schema == TestSchema.Expando) {
          ctx.skip();
          return;
        }

        const obj = await createObject({ nestedArray: [{ field: 'foo' }] });
        expect(() => change(obj, (o) => (o.string = 1 as any))).to.throw();
        expect(() => change(obj, (o) => (o.nested = { field: 1 } as any))).to.throw();
        change(obj, (o) => (o.nested = { field: 'bar' }));
        expect(() => change(obj, (o) => (o.nested!.field = 1 as any))).to.throw();
        expect(() => change(obj, (o) => o.nestedArray?.push({ field: 1 } as any))).to.throw();
        expect(() => change(obj, (o) => o.nestedArray?.unshift({ field: 1 } as any))).to.throw();
        expect(() => change(obj, (o) => (o.nestedArray![0] = { field: 1 } as any))).to.throw();
        expect(() => change(obj, (o) => (o.nestedArray![0].field = 1 as any))).to.throw();
        change(obj, (o) => o.nestedArray?.push({ field: 'bar' }));
        expect(() => change(obj, (o) => o.nestedArray?.splice(1, 0, { field: 1 } as any))).to.throw();
        expect(() => change(obj, (o) => (o.nestedArray![1].field = 1 as any))).to.throw();
      });

      test('getSchemaDXN', async () => {
        const obj = await createObject({ number: 42 });
        const schema = Obj.getSchema(obj);
        expect(Obj.getTypeDXN(obj)?.toString()).to.deep.eq(schema && getSchemaDXN(schema)?.toString());
      });

      test('can assign arrays with objects', async () => {
        const obj = await createObject();

        change(obj, (o) => {
          o.nestedArray = [{ field: 'bar' }, { field: 'baz' }];
        });
        expect(obj.nestedArray![0].field).to.eq('bar');

        change(obj, (o) => {
          o.nestedArray![0].field = 'baz';
        });
        expect(obj.nestedArray![0].field).to.eq('baz');

        change(obj, (o) => {
          o.nestedArray![1].field = 'bar';
        });
        expect(obj.nestedArray![1].field).to.eq('bar');
      });

      test('can assign arrays with arrays', async () => {
        const obj = await createObject();

        change(obj, (o) => {
          o.twoDimNumberArray = [
            [1, 2, 3],
            [4, 5, 6],
          ];
        });
        expect(obj.twoDimNumberArray![0][0]).to.eq(1);

        change(obj, (o) => {
          o.twoDimNumberArray![0][0] = 4;
        });
        expect(obj.twoDimNumberArray![0][0]).to.eq(4);
      });

      test('array sub-proxies maintain their identity', async () => {
        const obj = await createObject();

        change(obj, (o) => {
          o.nestedArray = [{ field: 'bar' }];
        });

        expect(obj.nestedArray === obj.nestedArray).to.be.true;
      });

      test('assigning another reactive object requires Ref.make', async () => {
        const obj = await createObject();
        const other = await createObject({ string: 'bar' });

        // Direct assignment of root ECHO objects (created with Obj.make) is not allowed.
        // Must use Ref.make for object references.
        expect(() => {
          change(obj, (o) => {
            o.other = other;
          });
        }).toThrow(/Object references must be wrapped with `Ref\.make`/);
      });

      test('assigning plain objects works', async () => {
        const obj = await createObject();

        // Plain objects (not created with Obj.make) can be assigned directly.
        change(obj, (o) => {
          o.nested = { field: 'bar' };
        });
        expect(obj.nested.field).to.eq('bar');

        using updates = updateCounter(obj);

        expect(updates.count, 'update count').to.eq(0);
        change(obj, (o) => {
          o.nested.field = 'baz';
        });
        expect(updates.count, 'update count').to.eq(1);
        expect(obj.nested.field).to.eq('baz');
      });

      test('keys enumeration', async () => {
        const obj = await createObject({ string: 'bar' });
        expect(Object.keys(obj).filter((key) => key !== 'id')).to.deep.eq(['string']);

        change(obj, (o) => {
          o.number = 42;
        });
        expect(Object.keys(obj).filter((key) => key !== 'id')).to.deep.eq(['string', 'number']);

        if (objectsHaveId) {
          expect(Object.keys(obj)).to.include('id');
        }
      });

      test('has', async () => {
        const obj = await createObject({ string: 'bar' });
        expect('string' in obj).to.be.true;
        expect('number' in obj).to.be.false;

        change(obj, (o) => {
          o.number = 42;
        });
        expect('number' in obj).to.be.true;
      });

      test('Array.isArray', async () => {
        const obj = await createObject({ stringArray: ['1', '2', '3'] });
        expect(Array.isArray(obj.stringArray)).to.be.true;
      });

      test('instanceof', async () => {
        const obj = await createObject({ stringArray: ['1', '2', '3'], nested: { field: 'foo' } });
        expect(obj instanceof Object).to.be.true;
        expect(obj instanceof Array).to.be.false;
        expect(obj.stringArray instanceof Object).to.be.true;
        expect(obj.stringArray instanceof Array).to.be.true;
        expect(obj.nested instanceof Object).to.be.true;
        expect(obj.nested instanceof Array).to.be.false;
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
          expect({ ...obj }).to.deep.eq({ ...TEST_OBJECT, id: (obj as any).id });
        }
      });

      test('toJSON', async () => {
        const obj = await createObject({ ...TEST_OBJECT });
        const expected = JSON.parse(JSON.stringify(TEST_OBJECT));
        const actual = JSON.parse(JSON.stringify(obj));

        if (!objectsHaveId && !schema) {
          expect(actual).to.deep.eq(expected);
        } else if (!objectsHaveId && !!schema) {
          expect(actual).to.deep.contain({ '@meta': { keys: [] }, ...expected });
        } else {
          expect(actual).to.deep.contain({ id: (obj as any).id, ...expected });
        }
      });

      test('chai deep equal works', async () => {
        const obj = await createObject({ ...TEST_OBJECT });
        const expected = objectsHaveId ? { ...TEST_OBJECT, id: (obj as any).id } : TEST_OBJECT;
        expect(obj).to.deep.eq(expected);
        expect(obj).to.not.deep.eq({ ...expected, number: 11 });
      });

      test('jest deep equal works', async () => {
        const obj = await createObject({ ...TEST_OBJECT });
        const expected = objectsHaveId ? { ...TEST_OBJECT, id: (obj as any).id } : TEST_OBJECT;
        expect(obj).toEqual(expected);
        expect(obj).not.toEqual({ ...expected, number: 11 });
      });

      // Not a typical use case, but might come up when interacting with 3rd party libraries.
      test('defineProperty', async () => {
        const obj = await createObject();
        using updates = updateCounter(obj);

        change(obj, () => {
          Object.defineProperty(obj, 'string', { value: 'bar' });
        });
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

        change(obj, (o) => {
          delete o.string;
        });
        expect(obj.string).to.be.undefined;
        change(obj, (o) => {
          delete o.number;
        });
        expect(obj.number).to.be.undefined;
        change(obj, (o) => {
          delete o.stringArray;
        });
        expect(obj.stringArray).to.be.undefined;
        change(obj, (o) => {
          delete o.other.first;
        });
        expect(obj.other.first).to.be.undefined;
        expect(obj.other).to.deep.eq({ second: 2 });
      });

      describe('signal updates', () => {
        test('are synchronous', async () => {
          const obj = await createObject({ string: 'bar' });
          using updates = updateCounter(obj);
          expect(updates.count, 'update count').to.eq(0);

          change(obj, (o) => {
            o.string = 'baz';
          });
          expect(updates.count, 'update count').to.eq(1);
        });

        test('in nested objects', async () => {
          const obj = await createObject({ nested: { field: 'bar' } });
          using updates = updateCounter(obj);
          expect(updates.count, 'update count').to.eq(0);

          change(obj, (o) => {
            o.nested!.field = 'baz';
          });
          expect(updates.count, 'update count').to.eq(1);
        });

        test('in nested arrays', async () => {
          const obj = await createObject({ stringArray: ['7'] });
          using updates = updateCounter(obj);
          expect(updates.count, 'update count').to.eq(0);

          change(obj, (o) => {
            o.stringArray![0] = '42';
          });
          expect(updates.count, 'update count').to.eq(1);
        });

        test('in nested arrays with objects', async () => {
          const obj = await createObject({ nestedArray: [{ field: 'bar' }] });
          using updates = updateCounter(obj);
          expect(updates.count, 'update count').to.eq(0);

          change(obj, (o) => {
            o.nestedArray![0].field = 'baz';
          });
          expect(updates.count, 'update count').to.eq(1);
        });

        test('in nested arrays with arrays', async () => {
          const obj = await createObject({ twoDimNumberArray: [[1, 2, 3]] });
          using updates = updateCounter(obj);
          expect(updates.count, 'update count').to.eq(0);

          change(obj, (o) => {
            o.twoDimNumberArray![0][0] = 4;
          });
          expect(updates.count, 'update count').to.eq(1);
        });

        test('Object.keys', async () => {
          const obj = await createObject({ number: 42 });
          using updates = updateCounter(obj);
          expect(updates.count).to.eq(0);

          change(obj, (o) => {
            o.string = 'foo';
          });
          expect(updates.count).to.eq(1);

          change(obj, (o) => {
            o.boolean = false;
          });
          expect(updates.count).to.eq(2);
        });
      });

      describe('array operations', () => {
        const createReactiveArray = async (
          stringArray: string[],
        ): Promise<{ array: readonly string[]; parent: TestSchema.Example }> => {
          const obj = await createObject({ stringArray });
          return { array: obj.stringArray!, parent: obj };
        };

        test('set by index', async () => {
          const { array, parent } = await createReactiveArray(['1', '2', '3']);
          using updates = updateCounter(parent);

          change(parent, (o) => {
            o.stringArray![0] = '2';
          });
          expect(array[0]).to.eq('2');
          expect(updates.count, 'update count').to.eq(1);
        });

        test('length', async () => {
          const { array, parent } = await createReactiveArray(['1', '2', '3']);
          using updates = updateCounter(parent);
          expect(array.length).to.eq(3);

          change(parent, (o) => {
            o.stringArray!.push('4');
          });
          expect(array.length).to.eq(4);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('set length', async () => {
          const { array, parent } = await createReactiveArray(['1', '2', '3']);
          using updates = updateCounter(parent);

          change(parent, (o) => {
            o.stringArray!.length = 2;
          });
          expect(array.length).to.eq(2);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('push', async () => {
          const { array, parent } = await createReactiveArray(['1', '2', '3']);
          using updates = updateCounter(parent);

          change(parent, (o) => {
            o.stringArray!.push('4');
          });
          expect(array).to.deep.eq(['1', '2', '3', '4']);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('pop', async () => {
          const { array, parent } = await createReactiveArray(['1', '2', '3']);
          using updates = updateCounter(parent);

          let value: string | undefined;
          change(parent, (o) => {
            value = o.stringArray!.pop();
          });
          expect(value).to.eq('3');
          expect(array).to.deep.eq(['1', '2']);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('shift', async () => {
          const { array, parent } = await createReactiveArray(['1', '2', '3']);
          using updates = updateCounter(parent);

          let value: string | undefined;
          change(parent, (o) => {
            value = o.stringArray!.shift();
          });
          expect(value).to.eq('1');
          expect(array).to.deep.eq(['2', '3']);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('unshift', async () => {
          const { array, parent } = await createReactiveArray(['1', '2', '3']);
          using updates = updateCounter(parent);

          let newLength: number = 0;
          change(parent, (o) => {
            newLength = o.stringArray!.unshift('0');
          });
          expect(newLength).to.eq(4);
          expect(array).to.deep.eq(['0', '1', '2', '3']);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('splice', async () => {
          const { array, parent } = await createReactiveArray(['1', '2', '3']);
          using updates = updateCounter(parent);

          let removed: string[] = [];
          change(parent, (o) => {
            removed = o.stringArray!.splice(1, 1, '4');
          });
          expect(removed).to.deep.eq(['2']);
          expect(array).to.deep.eq(['1', '4', '3']);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('sort', async () => {
          const { array, parent } = await createReactiveArray(['3', '2', '1']);
          using updates = updateCounter(parent);

          let returnValue: string[] = [];
          change(parent, (o) => {
            returnValue = o.stringArray!.sort();
          });
          expect(returnValue === array).to.be.true;
          expect(array).to.deep.eq(['1', '2', '3']);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('filter', async () => {
          const { array } = await createReactiveArray(['1', '2', '3']);
          const returnValue = array.filter((v) => Number(v) & 1);
          expect(returnValue).to.deep.eq(['1', '3']);
        });

        test('reverse', async () => {
          const { array, parent } = await createReactiveArray(['1', '2', '3']);
          using updates = updateCounter(parent);

          let returnValue: string[] = [];
          change(parent, (o) => {
            returnValue = o.stringArray!.reverse();
          });
          expect(returnValue === array).to.be.true;
          expect(array).to.deep.eq(['3', '2', '1']);
          expect(updates.count, 'update count').to.eq(1);
        });

        test('map', async () => {
          const { array, parent } = await createReactiveArray(['1', '2', '3']);
          using updates = updateCounter(parent);

          const result = array.map((value) => String(Number(value) * 2));
          expect(Array.isArray(result)).to.be.true;
          expect(Object.getPrototypeOf(result)).to.eq(Array.prototype);
          expect(result).to.deep.eq(['2', '4', '6']);
          expect(updates.count, 'update count').to.eq(0);
        });

        test('flatMap', async () => {
          const { array, parent } = await createReactiveArray(['1', '2', '3']);
          using updates = updateCounter(parent);

          const result = array.flatMap((value) => [value, String(Number(value) * 2)]);
          expect(Array.isArray(result)).to.be.true;
          expect(Object.getPrototypeOf(result)).to.eq(Array.prototype);
          expect(result).to.deep.eq(['1', '2', '2', '4', '3', '6']);
          expect(updates.count, 'update count').to.eq(0);
        });

        test('flat', async () => {
          const obj = await createObject({ twoDimNumberArray: [[1], [2, 3]] });
          const array = obj.twoDimNumberArray!;
          using updates = updateCounter(obj);

          const result = array.flat();
          expect(Array.isArray(result)).to.be.true;
          expect(Object.getPrototypeOf(result)).to.eq(Array.prototype);
          expect(result).to.deep.eq([1, 2, 3]);
          expect(updates.count, 'update count').to.eq(0);
        });

        test('forEach', async () => {
          const { array, parent } = await createReactiveArray(['1', '2', '3']);
          using updates = updateCounter(parent);

          let sum = 0;
          array.forEach((value) => {
            sum += Number(value);
          });
          expect(sum).to.eq(6);
          expect(updates.count, 'update count').to.eq(0);
        });

        test('spreading', async () => {
          const { array, parent } = await createReactiveArray(['1', '2', '3']);
          using updates = updateCounter(parent);

          const result = [...array];
          expect(Array.isArray(result)).to.be.true;
          expect(Object.getPrototypeOf(result)).to.eq(Array.prototype);
          expect(result).to.deep.eq(['1', '2', '3']);
          expect(updates.count, 'update count').to.eq(0);
        });

        test('values', async () => {
          const { array, parent } = await createReactiveArray(['1', '2', '3']);
          using updates = updateCounter(parent);

          const result = array.values();
          expect(result.next().value).to.eq('1');
          expect(result.next().value).to.eq('2');
          expect(result.next().value).to.eq('3');
          expect(result.next().done).to.be.true;
          expect(updates.count, 'update count').to.eq(0);
        });

        test('for loop', async () => {
          const { array, parent } = await createReactiveArray(['1', '2', '3']);
          using updates = updateCounter(parent);

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
