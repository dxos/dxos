//
// Copyright 2024 DXOS.org
//
import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';
import { TypedObject } from '@dxos/echo-schema';

export class TodoType extends TypedObject({ typename: 'dxos.app.todomvc.Todo', version: '0.1.0' })({
  title: S.string,
  completed: S.boolean,
}) {}

export class TodoListType extends TypedObject({ typename: 'dxos.app.todomvc.TodoList', version: '0.1.0' })({
  todos: S.mutable(S.array(E.ref(TodoType))),
}) {}
