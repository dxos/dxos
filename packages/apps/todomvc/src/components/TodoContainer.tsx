//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { type Ref } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';

import { type Todo } from '../types';

import { TodoItem } from './TodoItem';

export type TodoContainerProps = {
  todo: Ref.Ref<Todo>;
  editing: boolean;
  /**
   * Optional filter for completion status.
   * - `undefined`: Show all todos.
   * - `true`: Show only completed todos.
   * - `false`: Show only active todos.
   */
  completedFilter?: boolean;
  onEdit: () => void;
  onSave: (title: string) => void;
  onCancel: () => void;
  onDestroy: () => void;
};

/**
 * Container component that subscribes to a todo ref.
 * Uses useObject to dereference the ref and subscribe for reactive updates.
 * Wraps the presentational TodoItem component.
 */
export const TodoContainer = ({
  todo: todoRef,
  completedFilter,
  editing,
  onEdit,
  onSave,
  onCancel,
  onDestroy,
}: TodoContainerProps) => {
  // Subscribe to the todo ref (handles async loading and reactive updates).
  const [todo, updateTodo] = useObject(todoRef);

  if (!todo) {
    return null;
  }

  // If the todo doesn't match the filter, don't render it.
  if (completedFilter !== undefined && !!todo.completed !== completedFilter) {
    return null;
  }

  return (
    <TodoItem
      key={todo.id}
      title={todo.title}
      completed={!!todo.completed}
      onToggle={() =>
        updateTodo((t) => {
          t.completed = !t.completed;
        })
      }
      onDestroy={onDestroy}
      onEdit={onEdit}
      editing={editing}
      onSave={(title) => {
        updateTodo((t) => {
          t.title = title;
        });
        onSave(title);
      }}
      onCancel={onCancel}
    />
  );
};
