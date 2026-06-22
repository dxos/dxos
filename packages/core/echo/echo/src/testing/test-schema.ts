//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN } from '@dxos/keys';

import * as Obj from '../Obj';
import * as Ref from '../Ref';
import * as Type from '../Type';

export namespace TestSchema {
  //
  // Expando
  //

  /**
   * Expando object is an object with an arbitrary set of properties.
   * This is the test variant with example.com namespace.
   */
  export class Expando extends Type.makeObject<Expando>(DXN.make('com.example.type.expando', '0.1.0'))(
    Schema.Struct({}, { key: Schema.String, value: Schema.Any }),
  ) {}

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
    reference: Schema.suspend((): Ref.RefSchema<Example> => Ref.Ref(Example)),
    referenceArray: Schema.Array(Schema.suspend((): Ref.RefSchema<Example> => Ref.Ref(Example))),
    classInstance: Schema.instanceOf(TestClass),
    other: Schema.Any,
  }).pipe(Schema.partial);

  /** @deprecated Use another test schema or create a specific local test schema. */
  export interface ExampleSchema extends Schema.Schema.Type<typeof ExampleSchema> {}

  /** @deprecated Use another test schema or create a specific local test schema. */
  export class Example extends Type.makeObject<Example>(DXN.make('com.example.type.example', '0.1.0'))(
    ExampleSchema,
  ) {}

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

  export class Message extends Type.makeObject<Message>(DXN.make('com.example.type.message', '0.1.0'))(MessageStruct) {}

  //
  // Organization
  //

  export class Organization extends Type.makeObject<Organization>(DXN.make('com.example.type.organization', '0.1.0'))(
    Schema.Struct({
      name: Schema.String,
      properties: Schema.optional(
        Schema.Record({
          key: Schema.String,
          value: Schema.String,
        }),
      ),
    }),
  ) {}

  //
  // Person
  //

  export class Person extends Type.makeObject<Person>(DXN.make('com.example.type.person', '0.1.0'))(
    Schema.Struct({
      name: Schema.String,
      username: Schema.String,
      email: Schema.String,
      age: Schema.Number.pipe(Schema.optional),
      tasks: Schema.Array(Schema.suspend((): Ref.RefSchema<Task> => Ref.Ref(Task))),
      employer: Schema.optional(Ref.Ref(Organization)),
      address: Schema.Struct({
        city: Schema.optional(Schema.String),
        state: Schema.optional(Schema.String),
        zip: Schema.optional(Schema.String),
        coordinates: Schema.Struct({
          lat: Schema.optional(Schema.Number),
          lng: Schema.optional(Schema.Number),
        }),
      }),
      fields: Schema.Struct({
        label: Schema.String,
        value: Schema.String,
      }).pipe(Schema.Array, Schema.optional),
    }).pipe(Schema.partial),
  ) {}

  //
  // Task
  //

  export class Task extends Type.makeObject<Task>(DXN.make('com.example.type.task', '0.1.0'))(
    Schema.Struct({
      title: Schema.optional(Schema.String),
      deadline: Schema.optional(Schema.String),
      completed: Schema.optional(Schema.Boolean),
      assignee: Schema.optional(Ref.Ref(Person)),
      previous: Schema.optional(Schema.suspend((): Ref.RefSchema<Task> => Ref.Ref(Task))),
      subTasks: Schema.optional(Schema.Array(Schema.suspend((): Ref.RefSchema<Task> => Ref.Ref(Task)))),
      description: Schema.optional(Schema.String),
    }).pipe(Schema.partial),
  ) {}

  //
  // HasManager
  //

  export class HasManager extends Type.makeRelation<HasManager>(DXN.make('com.example.type.hasManager', '0.1.0'))({
    source: Person,
    target: Person,
  })(Schema.Struct({})) {}

  //
  // EmployedBy
  //

  export class EmployedBy extends Type.makeRelation<EmployedBy>(DXN.make('com.example.type.employedBy', '0.1.0'))({
    source: Person,
    target: Organization,
  })(
    Schema.Struct({
      role: Schema.String,
      since: Schema.optional(Schema.String),
    }),
  ) {}

  //
  // RecordType
  //

  export enum RecordType {
    UNDEFINED = 0,
    PERSONAL = 1,
    WORK = 2,
  }

  export class Container extends Type.makeObject<Container>(DXN.make('com.example.type.container', '0.1.0'))(
    Schema.Struct({
      objects: Schema.Array(Ref.Ref(Obj.Unknown)),
      records: Schema.Array(
        Schema.partial(
          Schema.Struct({
            title: Schema.String,
            description: Schema.String,
            contacts: Schema.Array(Ref.Ref(Person)),
            type: Schema.Enums(RecordType),
          }),
        ),
      ),
    }).pipe(Schema.partial),
  ) {}
}
