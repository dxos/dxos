//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { expect } from 'chai';
import get from 'lodash.get';

import { describe, test } from '@dxos/test';

import { SchemaValidator } from './schema-validator';
import { create } from '../handler';
import { TypedObject } from '../typed-object-class';

describe('schema-validator', () => {
  describe('validateSchema', () => {
    test('throws on ambiguous discriminated type union', () => {
      const schema = S.struct({
        union: S.union(S.struct({ a: S.number }), S.struct({ b: S.string })),
      });
      expect(() => SchemaValidator.validateSchema(schema)).to.throw();
    });
  });

  describe('hasPropertyAnnotation', () => {
    test('has annotation', () => {
      const annotationId = Symbol('foo');
      const annotationValue = 'bar';
      const human: S.Schema<any> = S.struct({
        name: S.string.annotations({ [annotationId]: annotationValue }),
        parent: S.optional(S.suspend(() => human.annotations({ [annotationId]: annotationValue }))),
        friends: S.suspend(() => S.mutable(S.array(human.annotations({ [annotationId]: annotationValue })))),
      });
      expect(SchemaValidator.hasTypeAnnotation(human, 'name', annotationId)).to.be.true;
      expect(SchemaValidator.hasTypeAnnotation(human, 'parent', annotationId)).to.be.true;
      expect(SchemaValidator.hasTypeAnnotation(human, 'friends', annotationId)).to.be.true;
    });

    test('no annotation', () => {
      const annotationId = Symbol('foo');
      const human: S.Schema<any> = S.struct({
        name: S.string,
        parent: S.optional(S.suspend(() => human)),
        friends: S.suspend(() => S.mutable(S.array(human))),
      });
      expect(SchemaValidator.hasTypeAnnotation(human, 'name', annotationId)).to.be.false;
      expect(SchemaValidator.hasTypeAnnotation(human, 'parent', annotationId)).to.be.false;
      expect(SchemaValidator.hasTypeAnnotation(human, 'friends', annotationId)).to.be.false;
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

    test('preserves annotations', () => {
      const annotationId = Symbol('foo');
      const annotationValue = 'bar';
      const human: S.Schema<any> = S.struct({
        parent: S.optional(S.suspend(() => human.annotations({ [annotationId]: annotationValue }))),
        friends: S.suspend(() => S.mutable(S.array(human.annotations({ [annotationId]: annotationValue })))),
      });
      expect(SchemaValidator.getPropertySchema(human, ['parent']).ast.annotations[annotationId]).to.eq(annotationValue);
      expect(SchemaValidator.getPropertySchema(human, ['friends', '0']).ast.annotations[annotationId]).to.eq(
        annotationValue,
      );
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

    test('record', () => {
      const schema = S.mutable(
        S.struct({
          meta: S.optional(S.mutable(S.record(S.string, S.any))),
        }),
      );

      {
        const object = create(schema, {});
        (object.meta ??= {}).test = 100;
        expect(object.meta.test).to.eq(100);
      }

      {
        type Test1 = S.Schema.Type<typeof schema>;

        const object: Test1 = {};
        (object.meta ??= {}).test = 100;
        expect(object.meta.test).to.eq(100);
      }

      {
        class Test2 extends TypedObject({
          typename: 'dxos.org/type/FunctionTrigger',
          version: '0.1.0',
        })({
          meta: S.optional(S.mutable(S.record(S.string, S.any))),
        }) {}

        const object = create(Test2, {});
        (object.meta ??= {}).test = 100;
        expect(object.meta.test).to.eq(100);
      }
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
});
