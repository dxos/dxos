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
  export const Expando = Schema.Struct({}, { key: Schema.String, value: Schema.Any }).pipe(
    Type.object(DXN.make('com.example.type.expando', '0.1.0')),
  );

  export type Expando = Type.InstanceType<typeof Expando>;

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
  export interface ExampleSchema {
    readonly string?: string;
    readonly number?: number;
    readonly boolean?: boolean;
    readonly null?: null;
    readonly undefined?: undefined;
    readonly stringArray?: readonly string[];
    readonly twoDimNumberArray?: readonly (readonly number[])[];
    readonly nested?: { readonly field: string };
    readonly nestedArray?: readonly { readonly field: string }[];
    readonly nestedNullableArray?: readonly ({ readonly field: string } | null)[];
    readonly reference?: Ref.Ref<Example>;
    readonly referenceArray?: readonly Ref.Ref<Example>[];
    readonly classInstance?: TestClass;
    readonly other?: any;
  }

  /** @deprecated Use another test schema or create a specific local test schema. */
  export const ExampleSchema: Schema.Schema<ExampleSchema> = Schema.Struct({
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
  }).pipe(Schema.partial) as any;

  /** @deprecated Use another test schema or create a specific local test schema. */
  export interface Example extends ExampleSchema, Obj.Unknown {}

  /** @deprecated Use another test schema or create a specific local test schema. */
  export const Example: Type.Obj<Example> = ExampleSchema.pipe(
    Type.object(DXN.make('com.example.type.example', '0.1.0')),
  ) as any;

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

  export const Message = MessageStruct.pipe(Type.object(DXN.make('com.example.type.message', '0.1.0')));

  export type Message = Type.InstanceType<typeof Message>;

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
  }).pipe(Type.object(DXN.make('com.example.type.organization', '0.1.0')));

  export type Organization = Type.InstanceType<typeof Organization>;

  //
  // Person
  //

  export interface Person extends Obj.Unknown {
    readonly name?: string;
    readonly username?: string;
    readonly email?: string;
    readonly age?: number;
    readonly tasks?: readonly Ref.Ref<Task>[];
    readonly employer?: Ref.Ref<Organization>;
    readonly address?: {
      readonly city?: string;
      readonly state?: string;
      readonly zip?: string;
      readonly coordinates?: { readonly lat?: number; readonly lng?: number };
    };
    readonly fields?: readonly { readonly label?: string; readonly value?: string }[];
  }

  export const Person: Type.Obj<Person> = Schema.Struct({
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
  }).pipe(Schema.partial, Type.object(DXN.make('com.example.type.person', '0.1.0'))) as any;

  //
  // Task
  //

  export interface Task extends Obj.Unknown {
    readonly title?: string;
    readonly deadline?: string;
    readonly completed?: boolean;
    readonly assignee?: Ref.Ref<Person>;
    readonly previous?: Ref.Ref<Task>;
    readonly subTasks?: readonly Ref.Ref<Task>[];
    readonly description?: string;
  }

  export const Task: Type.Obj<Task> = Schema.Struct({
    title: Schema.optional(Schema.String),
    deadline: Schema.optional(Schema.String),
    completed: Schema.optional(Schema.Boolean),
    assignee: Schema.optional(Ref.Ref(Person)),
    previous: Schema.optional(Schema.suspend((): Ref.RefSchema<Task> => Ref.Ref(Task))),
    subTasks: Schema.optional(Schema.Array(Schema.suspend((): Ref.RefSchema<Task> => Ref.Ref(Task)))),
    description: Schema.optional(Schema.String),
  }).pipe(Schema.partial, Type.object(DXN.make('com.example.type.task', '0.1.0'))) as any;

  //
  // HasManager
  //

  export const HasManager = Schema.Struct({}).pipe(
    Type.relation({
      dxn: DXN.make('com.example.type.hasManager', '0.1.0'),
      source: Person,
      target: Person,
    }),
  );

  export type HasManager = Type.InstanceType<typeof HasManager>;

  //
  // EmployedBy
  //

  export const EmployedBy = Schema.Struct({
    role: Schema.String,
    since: Schema.optional(Schema.String),
  }).pipe(
    Type.relation({
      dxn: DXN.make('com.example.type.employedBy', '0.1.0'),
      source: Person,
      target: Organization,
    }),
  );

  export type EmployedBy = Type.InstanceType<typeof EmployedBy>;

  //
  // RecordType
  //

  export enum RecordType {
    UNDEFINED = 0,
    PERSONAL = 1,
    WORK = 2,
  }

  export const Container = Schema.Struct({
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
  }).pipe(Schema.partial, Type.object(DXN.make('com.example.type.container', '0.1.0')));

  export type Container = Type.InstanceType<typeof Container>;
}
