//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { expect } from 'chai';
import get from 'lodash.get';

import { test, describe } from '@dxos/test';

import { SchemaValidator, setSchemaProperties } from './schema-validator';

describe('schema-validator', () => {
  describe('validateSchema', () => {
    test('throws on ambiguous discriminated type union', () => {
      const schema = S.struct({
        union: S.union(S.struct({ a: S.number }), S.struct({ b: S.string })),
      });
      expect(() => SchemaValidator.validateSchema(schema)).to.throw();
    });
  });

  describe('setSchemaProperties', () => {
    test('any', () => {
      const schema = S.struct({ field: S.any });
      const object: any = { field: { nested: { value: S.number } } };
      expect(() => setSchemaProperties(object, schema)).not.to.throw();
    });
  });

  describe('getPropertySchema', () => {
    const validateValueToAssign = (args: {
      schema: S.Schema<any>;
      target: any;
      path: string[];
      valueToAssign: any;
      expectToThrow?: boolean;
    }) => {
      const expectation = expect(() => {
        const nestedSchema = SchemaValidator.getPropertySchema(args.schema, args.path, (path) => {
          return get(args.target, path);
        });
        S.validateSync(nestedSchema)(args.valueToAssign);
      });
      if (args.expectToThrow) {
        expectation.to.throw();
      } else {
        expectation.not.to.throw();
      }
    };

    test('basic', () => {
      for (const value of [42, '42']) {
        validateValueToAssign({
          schema: S.struct({ object: S.struct({ field: S.number }) }),
          target: {},
          path: ['object', 'field'],
          valueToAssign: value,
          expectToThrow: typeof value !== 'number',
        });
      }
    });

    test('discriminated union', () => {
      const square = S.struct({ type: S.literal('square'), side: S.number });
      const circle = S.struct({ type: S.literal('circle'), radius: S.number });
      const shape = S.union(square, circle);
      validateValueToAssign({
        schema: shape,
        target: { type: 'square' },
        path: ['side'],
        valueToAssign: 1,
      });
      validateValueToAssign({
        schema: shape,
        target: { type: 'circle' },
        path: ['side'],
        valueToAssign: 1,
        expectToThrow: true,
      });
      validateValueToAssign({
        schema: shape,
        target: { type: 'square' },
        path: ['radius'],
        valueToAssign: 1,
        expectToThrow: true,
      });
    });

    test('any', () => {
      validateValueToAssign({
        schema: S.any,
        target: { field: { nested: { value: S.number } } },
        path: ['field', 'nested'],
        valueToAssign: { any: 'value' },
      });
    });

    test('index signatures', () => {
      for (const value of [42, '42']) {
        validateValueToAssign({
          schema: S.struct({ field: S.string }, { key: S.string, value: S.number }),
          target: {},
          path: ['unknownField'],
          valueToAssign: value,
          expectToThrow: typeof value !== 'number',
        });
      }
    });

    test('suspend', () => {
      const schemaWithSuspend = S.struct({
        array: S.optional(S.suspend(() => S.array(S.union(S.null, S.number)))),
        object: S.optional(S.suspend(() => S.union(S.null, S.struct({ field: S.number })))),
      });
      const target: any = { array: [1, 2, null], object: { field: 3 } };
      for (const value of [42, '42']) {
        for (const path of [
          ['array', '0'],
          ['object', 'field'],
        ]) {
          validateValueToAssign({
            schema: schemaWithSuspend,
            target,
            path,
            valueToAssign: value,
            expectToThrow: typeof value !== 'number',
          });
        }
      }
    });
  });

  describe('validateValue', () => {
    test('any', () => {
      const schema = S.struct({ field: S.any });
      const object: any = { field: { nested: { value: S.number } } };
      setSchemaProperties(object, schema);
      expect(() => SchemaValidator.validateValue(object, 'field', { any: 'value' })).not.to.throw();
    });

    test('index signatures', () => {
      const schema = S.struct({ field: S.string }, { key: S.string, value: S.number });
      const object: any = { field: 'test', unknownField: 1 };
      setSchemaProperties(object, schema);
      expect(() => SchemaValidator.validateValue(object, 'field', '42')).not.to.throw();
      expect(() => SchemaValidator.validateValue(object, 'unknownField', 42)).not.to.throw();
    });

    test('suspend', () => {
      const schema = S.struct({
        array: S.optional(S.suspend(() => S.array(S.union(S.null, S.number)))),
        object: S.optional(S.suspend(() => S.union(S.null, S.struct({ field: S.number })))),
      });
      const object: any = { array: [1, 2, null], object: { field: 3 } };
      SchemaValidator.prepareTarget(object, schema);
      expect(() => SchemaValidator.validateValue(object, 'object', { field: 4 })).not.to.throw();
      expect(() => SchemaValidator.validateValue(object.object, 'field', 4)).not.to.throw();
      expect(() => SchemaValidator.validateValue(object.array, '0', 4)).not.to.throw();
      expect(() => SchemaValidator.validateValue(object.array, '0', '4')).to.throw();
    });
  });
});
