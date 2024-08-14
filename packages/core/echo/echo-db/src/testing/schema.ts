//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';

import { Expando, ref, type Ref, TypedObject } from '@dxos/echo-schema';

export class Contact extends TypedObject({
  typename: 'example.test.Contact',
  version: '0.1.0',
})(
  {
    name: S.String,
    username: S.String,
    email: S.String,
    tasks: S.suspend((): S.Schema<Ref<Task>[]> => S.mutable(S.Array(ref(Task)))),
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

export class Todo extends TypedObject({
  typename: 'example.test.Task.Todo',
  version: '0.1.0',
})({
  name: S.optional(S.String),
}) {}

export class Task extends TypedObject({
  typename: 'example.test.Task',
  version: '0.1.0',
})({
  title: S.optional(S.String),
  completed: S.optional(S.Boolean),
  assignee: S.optional(Contact),
  previous: S.optional(S.suspend((): S.Schema<Ref<Task>> => ref(Task))),
  subTasks: S.optional(S.mutable(S.Array(S.suspend((): S.Schema<Ref<Task>> => ref(Task))))),
  description: S.optional(S.String),
  todos: S.optional(S.Array(ref(Todo))),
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
    objects: S.mutable(S.Array(ref(Expando))),
    records: S.mutable(
      S.Array(
        S.partial(
          S.Struct({
            title: S.String,
            description: S.String,
            contacts: S.mutable(S.Array(ref(Contact))),
            type: S.Enums(RecordType),
          }),
        ),
      ),
    ),
  },
  { partial: true },
) {}
