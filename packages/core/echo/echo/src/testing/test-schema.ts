//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Type from '../Type';

export namespace TestSchema {
  //
  // Expando
  //

  /**
   * Expando object is an object with an arbitrary set of properties.
   * This is the test variant with example.com namespace.
   */
  export const Expando = Schema.Struct({}, { key: Schema.String, value: Schema.Any }).pipe(
    Type.object({
      typename: 'example.com/type/Expando',
      version: '0.1.0',
    }),
  );

  export interface Expando extends Schema.Schema.Type<typeof Expando> {}

  //
  // Example
  //

  const Nested = Schema.Struct({
    field: Schema.String,
  });

  export class TestClass {
    field = 'value';
    toJSON() {
      return { field: this.field };
    }
  }

  /** @deprecated Use another test schema or create a specific local test schema. */
  export const ExampleSchema = Schema.Struct({
    string: Schema.String,
    number: Schema.Number,
    boolean: Schema.Boolean,
    null: Schema.Null,
    undefined: Schema.Undefined,
    stringArray: Schema.Array(Schema.String),
    twoDimNumberArray: Schema.Array(Schema.Array(Schema.Number)),
    nested: Nested,
    nestedArray: Schema.Array(Nested),
    nestedNullableArray: Schema.Array(Schema.Union(Nested, Schema.Null)),
    reference: Schema.suspend((): Type.Ref<Example> => Type.Ref(Example)),
    referenceArray: Schema.Array(Schema.suspend((): Type.Ref<Example> => Type.Ref(Example))),
    classInstance: Schema.instanceOf(TestClass),
    other: Schema.Any,
  }).pipe(Schema.partial);

  /** @deprecated Use another test schema or create a specific local test schema. */
  export interface ExampleSchema extends Schema.Schema.Type<typeof ExampleSchema> {}

  /** @deprecated Use another test schema or create a specific local test schema. */
  export const Example = ExampleSchema.pipe(
    Type.object({
      typename: 'example.com/type/Example',
      version: '0.1.0',
    }),
  );

  /** @deprecated Use another test schema or create a specific local test schema. */
  export interface Example extends Schema.Schema.Type<typeof Example> {}

  //
  // Message
  //

  // TODO(burdon): Support defaults directly on Type: `make` is erased by `pipe(Type.Obj)`.
  export const MessageStruct = Schema.Struct({
    // TODO(burdon): Support S.Date; Custom Timestamp (with defaults).
    // TODO(burdon): Support defaults (update create and create).
    timestamp: Schema.String.pipe(
      Schema.propertySignature,
      Schema.withConstructorDefault(() => new Date().toISOString()),
    ),
  });

  export const Message = MessageStruct.pipe(
    Type.object({
      typename: 'example.com/type/Message',
      version: '0.1.0',
    }),
  );

  export interface Message extends Schema.Schema.Type<typeof Message> {}

  //
  // Organization
  //

  export const Organization = Schema.Struct({
    name: Schema.String,
    properties: Schema.optional(
      Schema.Record({
        key: Schema.String,
        value: Schema.String,
      }),
    ),
  }).pipe(
    Type.object({
      typename: 'example.com/type/Organization',
      version: '0.1.0',
    }),
  );

  export interface Organization extends Schema.Schema.Type<typeof Organization> {}

  //
  // Person
  //

  export const Person = Schema.Struct({
    name: Schema.String,
    username: Schema.String,
    email: Schema.String,
    age: Schema.Number.pipe(Schema.optional),
    tasks: Schema.Array(Schema.suspend((): Type.Ref<Task> => Type.Ref(Task))),
    employer: Schema.optional(Type.Ref(Organization)),
    address: Schema.mutable(
      Schema.Struct({
        city: Schema.optional(Schema.String),
        state: Schema.optional(Schema.String),
        zip: Schema.optional(Schema.String),
        coordinates: Schema.Struct({
          lat: Schema.optional(Schema.Number),
          lng: Schema.optional(Schema.Number),
        }),
      }),
    ),
    fields: Schema.Struct({
      label: Schema.String,
      value: Schema.String,
    }).pipe(Schema.Array, Schema.optional),
  }).pipe(
    Schema.partial,
    Type.object({
      typename: 'example.com/type/Person',
      version: '0.1.0',
    }),
  );

  export interface Person extends Schema.Schema.Type<typeof Person> {}

  //
  // Task
  //

  export const Task = Schema.Struct({
    title: Schema.optional(Schema.String),
    deadline: Schema.optional(Schema.String),
    completed: Schema.optional(Schema.Boolean),
    assignee: Schema.optional(Type.Ref(Person)),
    previous: Schema.optional(Schema.suspend((): Type.Ref<Task> => Type.Ref(Task))),
    subTasks: Schema.optional(Schema.Array(Schema.suspend((): Type.Ref<Task> => Type.Ref(Task)))),
    description: Schema.optional(Schema.String),
  }).pipe(
    Schema.partial,
    Type.object({
      typename: 'example.com/type/Task',
      version: '0.1.0',
    }),
  );

  export interface Task extends Schema.Schema.Type<typeof Task> {}

  //
  // HasManager
  //

  export const HasManager = Schema.Struct({}).pipe(
    Type.relation({
      typename: 'example.com/type/HasManager',
      version: '0.1.0',
      source: Person,
      target: Person,
    }),
  );

  export interface HasManager extends Schema.Schema.Type<typeof HasManager> {}

  //
  // EmployedBy
  //

  export const EmployedBy = Schema.Struct({
    role: Schema.String,
    since: Schema.optional(Schema.String),
  }).pipe(
    Type.relation({
      typename: 'example.com/type/EmployedBy',
      version: '0.1.0',
      source: Person,
      target: Organization,
    }),
  );

  export interface EmployedBy extends Schema.Schema.Type<typeof EmployedBy> {}

  //
  // RecordType
  //

  export enum RecordType {
    UNDEFINED = 0,
    PERSONAL = 1,
    WORK = 2,
  }

  export const Container = Schema.Struct({
    objects: Schema.Array(Type.Ref(Type.Obj)),
    records: Schema.Array(
      Schema.partial(
        Schema.Struct({
          title: Schema.String,
          description: Schema.String,
          contacts: Schema.Array(Type.Ref(Person)),
          type: Schema.Enums(RecordType),
        }),
      ),
    ),
  }).pipe(
    Schema.partial,
    Type.object({
      typename: 'example.com/type/Container',
      version: '0.1.0',
    }),
  );

  export interface Container extends Schema.Schema.Type<typeof Container> {}
}
