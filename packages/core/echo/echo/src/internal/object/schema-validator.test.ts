//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { getDeep } from '@dxos/util';

import { SchemaValidator } from './schema-validator';

describe('schema-validator', () => {
  describe('validateSchema', () => {
    test('throws on ambiguous discriminated type union', () => {
      const TestSchema = Schema.Struct({
        union: Schema.Union(Schema.Struct({ a: Schema.Number }), Schema.Struct({ b: Schema.String })),
      });

      expect(() => SchemaValidator.validateSchema(TestSchema)).to.throw();
    });
  });

  describe('hasPropertyAnnotation', () => {
    test('has annotation', () => {
      const annotationId = Symbol('foo');
      const annotationValue = 'bar';
      const TestSchema: Schema.Schema.AnyNoContext = Schema.Struct({
        name: Schema.String.annotations({ [annotationId]: annotationValue }),
        parent: Schema.optional(Schema.suspend(() => TestSchema.annotations({ [annotationId]: annotationValue }))),
        friends: Schema.suspend(() =>
          Schema.mutable(Schema.Array(TestSchema.annotations({ [annotationId]: annotationValue }))),
        ),
      });
      expect(SchemaValidator.hasTypeAnnotation(TestSchema, 'name', annotationId)).to.be.true;
      expect(SchemaValidator.hasTypeAnnotation(TestSchema, 'parent', annotationId)).to.be.true;
      expect(SchemaValidator.hasTypeAnnotation(TestSchema, 'friends', annotationId)).to.be.true;
    });

    test('no annotation', () => {
      const annotationId = Symbol('foo');
      const Person: Schema.Schema.AnyNoContext = Schema.Struct({
        name: Schema.String,
        parent: Schema.optional(Schema.suspend(() => Person)),
        friends: Schema.suspend(() => Schema.mutable(Schema.Array(Person))),
      });
      expect(SchemaValidator.hasTypeAnnotation(Person, 'name', annotationId)).to.be.false;
      expect(SchemaValidator.hasTypeAnnotation(Person, 'parent', annotationId)).to.be.false;
      expect(SchemaValidator.hasTypeAnnotation(Person, 'friends', annotationId)).to.be.false;
    });
  });

  describe('getPropertySchema', () => {
    const validateValueToAssign = (args: {
      schema: Schema.Schema.AnyNoContext;
      target: any;
      path: string[];
      valueToAssign: any;
      expectToThrow?: boolean;
    }) => {
      const expectation = expect(() => {
        const nestedSchema = SchemaValidator.getPropertySchema(args.schema, args.path, (path) =>
          getDeep(args.target, path),
        );
        Schema.validateSync(nestedSchema)(args.valueToAssign);
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
          schema: Schema.Struct({ object: Schema.Struct({ field: Schema.Number }) }),
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
      const Person: Schema.Schema.AnyNoContext = Schema.Struct({
        parent: Schema.optional(Schema.suspend(() => Person.annotations({ [annotationId]: annotationValue }))),
        friends: Schema.suspend(() =>
          Schema.mutable(Schema.Array(Person.annotations({ [annotationId]: annotationValue }))),
        ),
      });
      expect(SchemaValidator.getPropertySchema(Person, ['parent']).ast.annotations[annotationId]).to.eq(
        annotationValue,
      );
      expect(SchemaValidator.getPropertySchema(Person, ['friends', '0']).ast.annotations[annotationId]).to.eq(
        annotationValue,
      );
    });

    test('discriminated union', () => {
      const square = Schema.Struct({ type: Schema.Literal('square'), side: Schema.Number });
      const circle = Schema.Struct({ type: Schema.Literal('circle'), radius: Schema.Number });
      const shape = Schema.Union(square, circle);
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
        schema: Schema.Any,
        target: { field: { nested: { value: Schema.Number } } },
        path: ['field', 'nested'],
        valueToAssign: { any: 'value' },
      });
    });
    test('index signatures', () => {
      for (const value of [42, '42']) {
        validateValueToAssign({
          schema: Schema.Struct({ field: Schema.String }, { key: Schema.String, value: Schema.Number }),
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
          schema: Schema.Struct({
            field: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Number })),
          }),
          target: {},
          path: ['field', 'unknownField'],
          valueToAssign: value,
          expectToThrow: typeof value !== 'number',
        });
      }
    });

    test('suspend', () => {
      const schemaWithSuspend = Schema.Struct({
        array: Schema.optional(Schema.suspend(() => Schema.Array(Schema.Union(Schema.Null, Schema.Number)))),
        object: Schema.optional(
          Schema.suspend(() => Schema.Union(Schema.Null, Schema.Struct({ field: Schema.Number }))),
        ),
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
