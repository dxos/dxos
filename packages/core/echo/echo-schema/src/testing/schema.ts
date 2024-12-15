//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/effect';

import { EchoObject } from '../ast';
import { Ref, type Ref$ } from '../ast/ref';
import { TypedObject, Expando } from '../object';

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

export class EmptySchemaType extends TypedObject({
  typename: 'example.com/type/Empty',
  version: '0.1.0',
})({}) {}

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

export const TestSchema = S.mutable(S.partial(S.Struct(fields)));
export type TestSchema = S.Schema.Type<typeof TestSchema>;

export class TestSchemaType extends TypedObject<TestSchemaType>({
  typename: 'example.com/type/Test',
  version: '0.1.0',
})(fields, { partial: true }) {}

// TODO(burdon): Why do we use need this rather then TestSchemaType?
export const TestType = TestSchema.pipe(EchoObject('example.com/type/Test', '0.1.0'));

export class TestClass {
  field = 'value';
  toJSON() {
    return { field: this.field };
  }
}

// TODO(dmaretskyi): Another top-level S.mutable call as a workaround for the regression in the last minor.
export const TestSchemaWithClass = S.mutable(
  S.extend(
    TestSchema,
    S.mutable(
      S.Struct({
        classInstance: S.optional(S.instanceOf(TestClass)),
      }),
    ),
  ),
);

export type TestSchemaWithClass = S.Schema.Type<typeof TestSchemaWithClass>;

export class Contact extends TypedObject<Contact>({
  typename: 'example.com/type/Contact',
  version: '0.1.0',
})(
  {
    name: S.String,
    username: S.String,
    email: S.String,
    tasks: S.suspend((): S.mutable<S.Array$<Ref$<Task>>> => S.mutable(S.Array(Ref(Task)))),
    address: S.Struct({
      city: S.optional(S.String),
      state: S.optional(S.String),
      zip: S.optional(S.String),
      coordinates: S.Struct({
        lat: S.optional(S.Number),
        lng: S.optional(S.Number),
      }),
    }),
  },
  { partial: true },
) {}

export class Task extends TypedObject({
  typename: 'example.com/type/Task',
  version: '0.1.0',
})({
  title: S.optional(S.String),
  completed: S.optional(S.Boolean),
  assignee: S.optional(Contact),
  previous: S.optional(S.suspend((): Ref$<Task> => Ref(Task))),
  // TODO(burdon): Document S.suspend.
  subTasks: S.optional(S.mutable(S.Array(S.suspend((): Ref$<Task> => Ref(Task))))),
  description: S.optional(S.String),
}) {}

export enum RecordType {
  UNDEFINED = 0,
  PERSONAL = 1,
  WORK = 2,
}

export class Container extends TypedObject({
  typename: 'example.com/type/Container',
  version: '0.1.0',
})(
  {
    objects: S.mutable(S.Array(Ref(Expando))),
    records: S.mutable(
      S.Array(
        S.partial(
          S.Struct({
            title: S.String,
            description: S.String,
            contacts: S.mutable(S.Array(Ref(Contact))),
            type: S.Enums(RecordType),
          }),
        ),
      ),
    ),
  },
  { partial: true },
) {}
