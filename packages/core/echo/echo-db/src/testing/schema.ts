//
// Copyright 2024 DXOS.org
//

import { Expando, TypedObject, ref, S } from '@dxos/echo-schema';

export class Contact extends TypedObject<Contact>({
  typename: 'example.com/type/Contact',
  version: '0.1.0',
})(
  {
    name: S.String,
    username: S.String,
    email: S.String,
    tasks: S.suspend((): S.mutable<S.Array$<ref<Task>>> => S.mutable(S.Array(ref(Task)))),
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
  previous: S.optional(S.suspend((): ref<Task> => ref(Task))),
  subTasks: S.optional(S.mutable(S.Array(S.suspend((): ref<Task> => ref(Task))))),
  description: S.optional(S.String),
}) {}

export enum RecordType {
  UNDEFINED = 0,
  PERSONAL = 1,
  WORK = 2,
}

export class Container extends TypedObject({
  typename: 'example.com/type/' + 'Container',
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
