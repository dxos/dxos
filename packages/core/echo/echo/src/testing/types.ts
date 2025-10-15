//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Type } from '..';

// TODO(burdon): These are non-canonical test types, so we really shouldn't export and use in other classes (compare with @dxos/sdk/testing).
export namespace Testing {
  const _Contact = Schema.Struct({
    name: Schema.String,
    username: Schema.String,
    email: Schema.String,
    tasks: Schema.mutable(Schema.Array(Schema.suspend((): Type.Ref<Task> => Type.Ref(Task)))),
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
      typename: 'example.com/type/Contact',
      version: '0.1.0',
    }),
  );
  export interface Contact extends Schema.Schema.Type<typeof _Contact> {}
  export const Contact: Schema.Schema<Contact, Schema.Schema.Encoded<typeof _Contact>, never> = _Contact;

  const _Task = Schema.Struct({
    title: Schema.optional(Schema.String),
    completed: Schema.optional(Schema.Boolean),
    assignee: Schema.optional(Type.Ref(Contact)),
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
  export interface Task extends Schema.Schema.Type<typeof _Task> {}
  export const Task: Schema.Schema<Task, Schema.Schema.Encoded<typeof _Task>, never> = _Task;

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
            contacts: Schema.mutable(Schema.Array(Type.Ref(Contact))),
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

  export const WorksFor = Schema.Struct({
    since: Schema.optional(Schema.String),
  }).pipe(
    Type.Relation({
      typename: 'example.com/type/WorksFor',
      version: '0.1.0',
      source: Contact,
      target: Contact,
    }),
  );
  export interface WorksFor extends Schema.Schema.Type<typeof WorksFor> {}
}
