//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import { TypedObject } from '../echo-object-class';

export class TestClass {
  field = 'value';

  toJSON() {
    return { field: this.field };
  }
}

const Circle = S.struct({ type: S.literal('circle'), radius: S.number });
const Square = S.struct({ type: S.literal('square'), side: S.number });
const Shape = S.union(Circle, Square);

const TestNestedSchema = S.mutable(S.struct({ field: S.string }));

const fields = {
  string: S.string,
  number: S.number,
  nullableShapeArray: S.mutable(S.array(S.union(Shape, S.null))),
  boolean: S.boolean,
  null: S.null,
  undefined: S.undefined,
  stringArray: S.mutable(S.array(S.string)),
  twoDimNumberArray: S.mutable(S.array(S.mutable(S.array(S.number)))),
  object: TestNestedSchema,
  objectArray: S.mutable(S.array(TestNestedSchema)),
  other: S.any,
};

export class TestSchemaClass extends TypedObject<TestSchemaClass>({
  typename: 'TestSchema',
  version: '1.0.0',
})(fields, { partial: true }) {}

export const TestSchema = S.mutable(S.partial(S.struct(fields)));
export type TestSchema = S.Schema.Type<typeof TestSchema>;

// TODO(dmaretskyi): Another top-level S.mutable call as a workaround for the regression in the last minor.
export const TestSchemaWithClass = S.mutable(
  S.extend(TestSchema, S.mutable(S.struct({ classInstance: S.optional(S.instanceOf(TestClass)) }))),
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
