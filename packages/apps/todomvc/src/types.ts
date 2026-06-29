//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';

export class Todo extends Type.makeObject<Todo>(DXN.make('com.example.type.todo', '0.1.0'))(
  Schema.Struct({
    title: Schema.String,
    completed: Schema.Boolean,
  }),
) {}

export class TodoList extends Type.makeObject<TodoList>(DXN.make('com.example.type.todoList', '0.1.0'))(
  Schema.Struct({
    todos: Schema.Array(Ref.Ref(Todo)),
  }),
) {}

/** Typed annotation storing the root TodoList reference on space properties. */
export const TodoListAnnotation = Annotation.make({
  id: 'com.example.annotation.todoList',
  schema: Ref.Ref(TodoList),
});

export const createTodoList = (space: Space): TodoList => {
  const list = space.db.add(Obj.make(TodoList, { todos: [] }));
  Obj.update(space.properties, (properties) => {
    Annotation.set(properties, TodoListAnnotation, Ref.make(list));
  });
  return list;
};
