//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { type Space, live } from '@dxos/react-client/echo';

export const Todo = Schema.Struct({
  title: Schema.String,
  completed: Schema.Boolean,
}).pipe(
  Type.def({
    typename: 'example.com/type/Todo',
    version: '0.1.0',
  }),
);
export type Todo = Schema.Schema.Type<typeof Todo>;

export const TodoList = Schema.Struct({
  todos: Schema.Array(Type.Ref(Todo)),
}).pipe(
  Type.def({
    typename: 'example.com/type/TodoList',
    version: '0.1.0',
  }),
);
export type TodoList = Schema.Schema.Type<typeof TodoList>;

export const createTodoList = (space: Space) => {
  const list = space.db.add(live(TodoList, { todos: [] }));
  space.properties[Type.getTypename(TodoList)] = Type.Ref.make(list);
  return list;
};
