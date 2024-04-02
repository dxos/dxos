import { EchoObjectSchema } from '../effect/echo-object-class';
import * as S from '@effect/schema/Schema';
import { Ref, ref } from '../effect/reactive';

export class Contact extends EchoObjectSchema({
  typename: 'example.test.Contact',
  version: '0.1.0',
})({
  name: S.optional(S.string),
  username: S.optional(S.string),
  email: S.optional(S.string),
  address: S.optional(
    S.struct({
      city: S.optional(S.string),
      state: S.optional(S.string),
      zip: S.optional(S.string),
      coordinates: S.struct({
        lat: S.optional(S.number),
        lng: S.optional(S.number),
      }),
    }),
  ),
}) {}

export class Todo extends EchoObjectSchema({
  typename: 'example.test.Task.Todo',
  version: '0.1.0',
})({
  name: S.optional(S.string),
}) {}

export class Task extends EchoObjectSchema({
  typename: 'example.test.Task',
  version: '0.1.0',
})({
  title: S.optional(S.string),
  completed: S.optional(S.boolean),
  assignee: S.optional(Contact),
  previous: S.optional(S.suspend((): S.Schema<Ref<Task>> => ref(Task))),
  subTasks: S.optional(S.array(S.suspend((): S.Schema<Ref<Task>> => ref(Task)))),
  description: S.optional(S.string),
  todos: S.optional(S.array(ref(Todo))),
}) {}
