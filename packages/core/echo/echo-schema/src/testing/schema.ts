//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import { Expando, type Ref, ref, TypedObject } from '../effect';

export class Contact extends TypedObject({
  typename: 'example.test.Contact',
  version: '0.1.0',
})(
  {
    name: S.string,
    username: S.string,
    email: S.string,
    tasks: S.suspend((): S.Schema<Ref<Task>[]> => S.mutable(S.array(ref(Task)))),
    address: S.struct({
      city: S.optional(S.string),
      state: S.optional(S.string),
      zip: S.optional(S.string),
      coordinates: S.struct({
        lat: S.optional(S.number),
        lng: S.optional(S.number),
      }),
    }),
  },
  { partial: true },
) {}

export class Todo extends TypedObject({
  typename: 'example.test.Task.Todo',
  version: '0.1.0',
})({
  name: S.optional(S.string),
}) {}

export class Task extends TypedObject({
  typename: 'example.test.Task',
  version: '0.1.0',
})({
  title: S.optional(S.string),
  completed: S.optional(S.boolean),
  assignee: S.optional(Contact),
  previous: S.optional(S.suspend((): S.Schema<Ref<Task>> => ref(Task))),
  subTasks: S.optional(S.mutable(S.array(S.suspend((): S.Schema<Ref<Task>> => ref(Task))))),
  description: S.optional(S.string),
  todos: S.optional(S.array(ref(Todo))),
}) {}

export enum RecordType {
  UNDEFINED = 0,
  PERSONAL = 1,
  WORK = 2,
}

export class Container extends TypedObject({
  typename: 'example.test.Container',
  version: '0.1.0',
})(
  {
    objects: S.mutable(S.array(ref(Expando))),
    records: S.mutable(
      S.array(
        S.partial(
          S.struct({
            title: S.string,
            description: S.string,
            contacts: S.mutable(S.array(ref(Contact))),
            type: S.enums(RecordType),
          }),
        ),
      ),
    ),
  },
  { partial: true },
) {}

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
