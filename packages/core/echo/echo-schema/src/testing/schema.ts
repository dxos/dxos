//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';

import { EchoObject } from '../annotations';
import { TypedObject } from '../typed-object-class';

// TODO(burdon): Clean up.

//
// Primitives
//

const Circle = S.Struct({ type: S.Literal('circle'), radius: S.Number });
const Square = S.Struct({ type: S.Literal('square'), side: S.Number });
const Shape = S.Union(Circle, Square);

//
// Simple types
//

const TestNestedSchema = S.mutable(S.Struct({ field: S.String }));
export type TestNestedSchema = S.Schema.Type<typeof TestNestedSchema>;
export const TestNestedType = TestNestedSchema.pipe(EchoObject('example.com/type/TestNested', '0.1.0'));

//
// Complex types
//

export const TEST_SCHEMA_TYPE = {
  typename: 'example.com/type/Test',
  version: '1.0.0',
};

const fields = {
  string: S.String,
  number: S.Number,
  nullableShapeArray: S.mutable(S.Array(S.Union(Shape, S.Null))),
  boolean: S.Boolean,
  null: S.Null,
  undefined: S.Undefined,
  stringArray: S.mutable(S.Array(S.String)),
  twoDimNumberArray: S.mutable(S.Array(S.mutable(S.Array(S.Number)))),
  object: TestNestedSchema,
  objectArray: S.mutable(S.Array(TestNestedSchema)),
  nested: S.optional(TestNestedType),
  other: S.Any,
};

//
// Manually create ECHO object.
//

export const TestSchema = S.mutable(S.partial(S.Struct(fields)));
export type TestSchema = S.Schema.Type<typeof TestSchema>;
export const TestType = TestSchema.pipe(EchoObject('example.com/type/Test', '0.1.0'));

//
// TODO(burdon): ???
//

export class EmptySchemaType extends TypedObject(TEST_SCHEMA_TYPE)({}) {}

export class TestSchemaType extends TypedObject<TestSchemaType>(TEST_SCHEMA_TYPE)(fields, { partial: true }) {}

//
//
//

export class TestClass {
  field = 'value';
  toJSON() {
    return { field: this.field };
  }
}

// TODO(dmaretskyi): Another top-level S.mutable call as a workaround for the regression in the last minor.
export const TestSchemaWithClass = S.mutable(
  S.extend(TestSchema, S.mutable(S.Struct({ classInstance: S.optional(S.instanceOf(TestClass)) }))),
);

export type TestSchemaWithClass = S.Schema.Type<typeof TestSchemaWithClass>;
