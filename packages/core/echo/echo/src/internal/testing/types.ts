//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { EchoObjectSchema, EchoRelationSchema } from '../entities';
import { TypedObject } from '../object';
import { Ref, type Ref$ } from '../ref';

/**
 * @deprecated
 */
// TOOD(burdon): Reconcile with ../testing (remove this).
export namespace Testing {
  //
  // Primitives
  //

  const Circle = Schema.Struct({ type: Schema.Literal('circle'), radius: Schema.Number });
  const Square = Schema.Struct({ type: Schema.Literal('square'), side: Schema.Number });
  const Shape = Schema.Union(Circle, Square);

  //
  // Simple types
  //

  const TestNestedSchema = Schema.mutable(Schema.Struct({ field: Schema.String }));
  export type TestNestedSchema = Schema.Schema.Type<typeof TestNestedSchema>;
  export const TestNestedType = TestNestedSchema.pipe(
    EchoObjectSchema({ typename: 'example.com/type/TestNested', version: '0.1.0' }),
  );

  //
  // Complex types
  // TODO(burdon): Change to Type.Obj.
  //

  export class EmptySchemaType extends TypedObject({
    typename: 'example.com/type/Empty',
    version: '0.1.0',
  })({}) {}

  const fields = {
    string: Schema.String,
    number: Schema.Number,
    nullableShapeArray: Schema.mutable(Schema.Array(Schema.Union(Shape, Schema.Null))),
    boolean: Schema.Boolean,
    null: Schema.Null,
    undefined: Schema.Undefined,
    stringArray: Schema.mutable(Schema.Array(Schema.String)),
    twoDimNumberArray: Schema.mutable(Schema.Array(Schema.mutable(Schema.Array(Schema.Number)))),
    object: TestNestedSchema,
    objectArray: Schema.mutable(Schema.Array(TestNestedSchema)),
    nested: Schema.optional(Ref(TestNestedType)),
    other: Schema.Any,
  };

  export const TestSchema = Schema.mutable(Schema.partial(Schema.Struct(fields)));
  export type TestSchema = Schema.Schema.Type<typeof TestSchema>;

  export class TestSchemaType extends TypedObject({
    typename: 'example.com/type/Test',
    version: '0.1.0',
  })(fields, { partial: true }) {} // TODO(burdon): Partial?

  // TODO(burdon): Why do we use need this rather then TestSchemaType?
  export const TestType = TestSchema.pipe(
    EchoObjectSchema({
      typename: 'example.com/type/Test',
      version: '0.1.0',
    }),
  );

  export class TestClass {
    field = 'value';
    toJSON() {
      return { field: this.field };
    }
  }

  // TODO(dmaretskyi): Another top-level Schema.mutable call as a workaround for the regression in the last minor.
  export const TestSchemaWithClass = Schema.mutable(
    Schema.extend(
      TestSchema,
      Schema.mutable(
        Schema.Struct({
          classInstance: Schema.optional(Schema.instanceOf(TestClass)),
        }),
      ),
    ),
  );

  export type TestSchemaWithClass = Schema.Schema.Type<typeof TestSchemaWithClass>;

  export class Person extends TypedObject({
    typename: 'example.com/type/Person',
    version: '0.1.0',
  })(
    {
      name: Schema.String,
      username: Schema.String,
      email: Schema.String,
      phoneNumbers: Schema.optional(Schema.Array(Schema.Struct({ label: Schema.String, number: Schema.String }))),
      tasks: Schema.suspend((): Schema.mutable<Schema.Array$<Ref$<Task>>> => Schema.mutable(Schema.Array(Ref(Task)))),
      address: Schema.Struct({
        city: Schema.optional(Schema.String),
        state: Schema.optional(Schema.String),
        zip: Schema.optional(Schema.String),
        coordinates: Schema.Struct({
          lat: Schema.optional(Schema.Number),
          lng: Schema.optional(Schema.Number),
        }),
      }),
    },
    { partial: true },
  ) {}

  export class Task extends TypedObject({
    typename: 'example.com/type/Task',
    version: '0.1.0',
  })(
    {
      title: Schema.optional(Schema.String),
      completed: Schema.optional(Schema.Boolean),
      assignee: Schema.optional(Ref(Person)),
      previous: Schema.optional(Schema.suspend((): Ref$<Task> => Ref(Task))),
      subTasks: Schema.optional(Schema.mutable(Schema.Array(Schema.suspend((): Ref$<Task> => Ref(Task))))),
      description: Schema.optional(Schema.String),
    },
    { partial: true },
  ) {}

  export const HasManager = Schema.Struct({
    since: Schema.optional(Schema.String),
  }).pipe(
    EchoRelationSchema({
      typename: 'example.com/type/HasManager',
      version: '0.1.0',
      source: Person,
      target: Person,
    }),
  );

  export interface HasManager extends Schema.Schema.Type<typeof HasManager> {}
}
