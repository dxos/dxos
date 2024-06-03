//
// Copyright 2024 DXOS.org
//
import { ref, S, TypedObject } from '@dxos/echo-schema';

export class TodoType extends TypedObject({ typename: 'dxos.app.todomvc.Todo', version: '0.1.0' })({
  title: S.String,
  completed: S.Boolean,
}) {}

export class TodoListType extends TypedObject({ typename: 'dxos.app.todomvc.TodoList', version: '0.1.0' })({
  todos: S.mutable(S.Array(ref(TodoType))),
}) {}
