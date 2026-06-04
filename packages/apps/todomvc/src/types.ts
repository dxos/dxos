//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';

export const Todo = Schema.Struct({
  title: Schema.String,
  completed: Schema.Boolean,
}).pipe(Type.makeObject(DXN.make('com.example.type.todo', '0.1.0')));
export type Todo = Type.InstanceType<typeof Todo>;

export const TodoList = Schema.Struct({
  todos: Schema.Array(Ref.Ref(Todo)),
}).pipe(Type.makeObject(DXN.make('com.example.type.todoList', '0.1.0')));
export type TodoList = Type.InstanceType<typeof TodoList>;

/** Typed annotation storing the root TodoList reference on space properties. */
export const TodoListAnnotation = Annotation.make({
  id: 'com.example.annotation.todoList',
  schema: Ref.Ref(TodoList),
});

export const createTodoList = (space: Space): TodoList => {
  const list = space.db.add(Obj.make(TodoList, { todos: [] }));
  Annotation.set(space.properties, TodoListAnnotation, Ref.make(list));
  return list;
};
