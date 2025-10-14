//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Ref, Type } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';

export const Todo = Schema.Struct({
  title: Schema.String,
  completed: Schema.Boolean,
}).pipe(
  Type.Obj({
    typename: 'example.com/type/Todo',
    version: '0.1.0',
  }),
);
export type Todo = Schema.Schema.Type<typeof Todo>;

export const TodoList = Schema.Struct({
  todos: Schema.Array(Type.Ref(Todo)),
}).pipe(
  Type.Obj({
    typename: 'example.com/type/TodoList',
    version: '0.1.0',
  }),
);
export type TodoList = Schema.Schema.Type<typeof TodoList>;

export const createTodoList = (space: Space) => {
  const list = space.db.add(Obj.make(TodoList, { todos: [] }));
  space.properties[TodoList.typename] = Ref.make(list);
  return list;
};
