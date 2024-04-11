//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import { TypedObject } from '../effect/echo-object-class';
import * as E from '../effect/reactive';
import { ExpandoType, type Ref, ref } from '../effect/reactive';

export class Contact extends TypedObject({
  typename: 'example.test.Contact',
  version: '0.1.0',
})(
  {
    name: S.string,
    username: S.string,
    email: S.string,
    tasks: S.suspend((): S.Schema<Ref<Task>[]> => S.mutable(S.array(E.ref(Task)))),
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
    objects: S.mutable(S.array(E.ref(ExpandoType))),
    records: S.mutable(
      S.array(
        S.partial(
          S.struct({
            title: S.string,
            description: S.string,
            contacts: S.mutable(S.array(E.ref(Contact))),
            type: S.enums(RecordType),
          }),
        ),
      ),
    ),
  },
  { partial: true },
) {}
