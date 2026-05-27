//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Obj, Ref, Type } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';

export const Todo = Schema.Struct({
  title: Schema.String,
  completed: Schema.Boolean,
}).pipe(Type.object(DXN.make('com.example.type.todo', '0.1.0')));
export type Todo = Schema.Schema.Type<typeof Todo>;

export const TodoList = Schema.Struct({
  todos: Schema.Array(Ref.Ref(Todo)),
}).pipe(Type.object(DXN.make('com.example.type.todoList', '0.1.0')));
export type TodoList = Schema.Schema.Type<typeof TodoList>;

export const createTodoList = (space: Space): TodoList => {
  const list = space.db.add(Obj.make(TodoList, { todos: [] }));
  Obj.update(space.properties, (props: any) => {
    props[TodoList.typename] = Ref.make(list);
  });
  return list;
};
