//
// Copyright 2024 DXOS.org
//

import { Ref, S, TypedObject } from '@dxos/echo-schema';
import { type Space, create, makeRef } from '@dxos/react-client/echo';

export class TodoType extends TypedObject({ typename: 'example.com/type/Todo', version: '0.1.0' })({
  title: S.String,
  completed: S.Boolean,
}) {}

export class TodoListType extends TypedObject({ typename: 'example.com/type/TodoList', version: '0.1.0' })({
  todos: S.mutable(S.Array(Ref(TodoType))),
}) {}

export const createTodoList = (space: Space) => {
  const list = space.db.add(create(TodoListType, { todos: [] }));
  space.properties[TodoListType.typename] = makeRef(list);
  return list;
};
