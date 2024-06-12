//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import { EchoObject } from '../annotations';
import { TypedObject } from '../typed-object-class';

export const TEST_SCHEMA_TYPE = {
  typename: 'TestSchema',
  version: '1.0.0',
};

export class GeneratedEmptySchema extends TypedObject(TEST_SCHEMA_TYPE)({}) {}

export class TestClass {
  field = 'value';

  toJSON() {
    return { field: this.field };
  }
}

const Circle = S.Struct({ type: S.Literal('circle'), radius: S.Number });
const Square = S.Struct({ type: S.Literal('square'), side: S.Number });
const Shape = S.Union(Circle, Square);

const TestNestedSchema = S.mutable(S.Struct({ field: S.String }));

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
  other: S.Any,
};

// TODO(burdon): Rename TestType.
export class TestSchemaClass extends TypedObject<TestSchemaClass>(TEST_SCHEMA_TYPE)(fields, { partial: true }) {}

export const TestSchema = S.mutable(S.partial(S.Struct(fields)));
export type TestSchema = S.Schema.Type<typeof TestSchema>;
export const TestType = TestSchema.pipe(EchoObject('TestSchema', '1.0.0'));

// TODO(dmaretskyi): Another top-level S.mutable call as a workaround for the regression in the last minor.
export const TestSchemaWithClass = S.mutable(
  S.extend(TestSchema, S.mutable(S.Struct({ classInstance: S.optional(S.instanceOf(TestClass)) }))),
);
export type TestSchemaWithClass = S.Schema.Type<typeof TestSchemaWithClass>;

export const TEST_OBJECT: TestSchema = {
  string: 'foo',
  number: 42,
  boolean: true,
  null: null,
  stringArray: ['1', '2', '3'],
  object: { field: 'bar' },
};
