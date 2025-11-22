//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Type from '../Type';

export namespace TestSchema {
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
    Type.Obj({
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
  }).pipe(
    Type.Obj({
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
    tasks: Schema.mutable(Schema.Array(Schema.suspend((): Type.Ref<Task> => Type.Ref(Task)))),
    employer: Schema.optional(Type.Ref(Organization)),
    address: Schema.Struct({
      city: Schema.optional(Schema.String),
      state: Schema.optional(Schema.String),
      zip: Schema.optional(Schema.String),
      coordinates: Schema.Struct({
        lat: Schema.optional(Schema.Number),
        lng: Schema.optional(Schema.Number),
      }),
    }),
  }).pipe(
    Schema.partial,
    Type.Obj({
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
    completed: Schema.optional(Schema.Boolean),
    assignee: Schema.optional(Type.Ref(Person)),
    previous: Schema.optional(Schema.suspend((): Type.Ref<Task> => Type.Ref(Task))),
    subTasks: Schema.optional(Schema.mutable(Schema.Array(Schema.suspend((): Type.Ref<Task> => Type.Ref(Task))))),
    description: Schema.optional(Schema.String),
  }).pipe(
    Schema.partial,
    Type.Obj({
      typename: 'example.com/type/Task',
      version: '0.1.0',
    }),
  );

  export interface Task extends Schema.Schema.Type<typeof Task> {}

  //
  // HasManager
  //

  export const HasManager = Schema.Struct({}).pipe(
    Type.Relation({
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
    Type.Relation({
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
    objects: Schema.mutable(Schema.Array(Type.Ref(Type.Expando))),
    records: Schema.mutable(
      Schema.Array(
        Schema.partial(
          Schema.Struct({
            title: Schema.String,
            description: Schema.String,
            contacts: Schema.mutable(Schema.Array(Type.Ref(Person))),
            type: Schema.Enums(RecordType),
          }),
        ),
      ),
    ),
  }).pipe(
    Schema.partial,
    Type.Obj({
      typename: 'example.com/type/Container',
      version: '0.1.0',
    }),
  );
}
