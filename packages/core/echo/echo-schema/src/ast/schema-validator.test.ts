//
// Copyright 2024 DXOS.org
//

import { Schema as S } from 'effect';
import { describe, expect, test } from 'vitest';

import { getDeep } from '@dxos/util';

import { SchemaValidator } from './schema-validator';

describe('schema-validator', () => {
  describe('validateSchema', () => {
    test('throws on ambiguous discriminated type union', () => {
      const TestSchema = S.Struct({
        union: S.Union(S.Struct({ a: S.Number }), S.Struct({ b: S.String })),
      });

      expect(() => SchemaValidator.validateSchema(TestSchema)).to.throw();
    });
  });

  describe('hasPropertyAnnotation', () => {
    test('has annotation', () => {
      const annotationId = Symbol('foo');
      const annotationValue = 'bar';
      const TestSchema: S.Schema.AnyNoContext = S.Struct({
        name: S.String.annotations({ [annotationId]: annotationValue }),
        parent: S.optional(S.suspend(() => TestSchema.annotations({ [annotationId]: annotationValue }))),
        friends: S.suspend(() => S.mutable(S.Array(TestSchema.annotations({ [annotationId]: annotationValue })))),
      });
      expect(SchemaValidator.hasTypeAnnotation(TestSchema, 'name', annotationId)).to.be.true;
      expect(SchemaValidator.hasTypeAnnotation(TestSchema, 'parent', annotationId)).to.be.true;
      expect(SchemaValidator.hasTypeAnnotation(TestSchema, 'friends', annotationId)).to.be.true;
    });

    test('no annotation', () => {
      const annotationId = Symbol('foo');
      const Person: S.Schema.AnyNoContext = S.Struct({
        name: S.String,
        parent: S.optional(S.suspend(() => Person)),
        friends: S.suspend(() => S.mutable(S.Array(Person))),
      });
      expect(SchemaValidator.hasTypeAnnotation(Person, 'name', annotationId)).to.be.false;
      expect(SchemaValidator.hasTypeAnnotation(Person, 'parent', annotationId)).to.be.false;
      expect(SchemaValidator.hasTypeAnnotation(Person, 'friends', annotationId)).to.be.false;
    });
  });

  describe('getPropertySchema', () => {
    const validateValueToAssign = (args: {
      schema: S.Schema.AnyNoContext;
      target: any;
      path: string[];
      valueToAssign: any;
      expectToThrow?: boolean;
    }) => {
      const expectation = expect(() => {
        const nestedSchema = SchemaValidator.getPropertySchema(args.schema, args.path, (path) => {
          return getDeep(args.target, path);
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
          schema: S.Struct({ object: S.Struct({ field: S.Number }) }),
          target: {},
          path: ['object', 'field'],
          valueToAssign: value,
          expectToThrow: typeof value !== 'number',
        });
      }
    });

    test('preserves annotations', () => {
      const annotationId = Symbol('foo');
      const annotationValue = 'bar';
      const Person: S.Schema.AnyNoContext = S.Struct({
        parent: S.optional(S.suspend(() => Person.annotations({ [annotationId]: annotationValue }))),
        friends: S.suspend(() => S.mutable(S.Array(Person.annotations({ [annotationId]: annotationValue })))),
      });
      expect(SchemaValidator.getPropertySchema(Person, ['parent']).ast.annotations[annotationId]).to.eq(
        annotationValue,
      );
      expect(SchemaValidator.getPropertySchema(Person, ['friends', '0']).ast.annotations[annotationId]).to.eq(
        annotationValue,
      );
    });

    test('discriminated union', () => {
      const square = S.Struct({ type: S.Literal('square'), side: S.Number });
      const circle = S.Struct({ type: S.Literal('circle'), radius: S.Number });
      const shape = S.Union(square, circle);
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
        schema: S.Any,
        target: { field: { nested: { value: S.Number } } },
        path: ['field', 'nested'],
        valueToAssign: { any: 'value' },
      });
    });
    test('index signatures', () => {
      for (const value of [42, '42']) {
        validateValueToAssign({
          schema: S.Struct({ field: S.String }, { key: S.String, value: S.Number }),
          target: {},
          path: ['unknownField'],
          valueToAssign: value,
          expectToThrow: typeof value !== 'number',
        });
      }
    });

    test('index signature from optional record', () => {
      for (const value of [42, '42']) {
        validateValueToAssign({
          schema: S.Struct({ field: S.optional(S.Record({ key: S.String, value: S.Number })) }),
          target: {},
          path: ['field', 'unknownField'],
          valueToAssign: value,
          expectToThrow: typeof value !== 'number',
        });
      }
    });

    test('suspend', () => {
      const schemaWithSuspend = S.Struct({
        array: S.optional(S.suspend(() => S.Array(S.Union(S.Null, S.Number)))),
        object: S.optional(S.suspend(() => S.Union(S.Null, S.Struct({ field: S.Number })))),
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
});
