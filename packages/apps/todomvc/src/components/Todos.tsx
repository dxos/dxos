//
// Copyright 2022 DXOS.org
//

import React, { type ChangeEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useParams, generatePath, useOutletContext } from 'react-router-dom';

import { create, Filter } from '@dxos/echo-schema';
import { type Space, useQuery, SpaceState } from '@dxos/react-client/echo';
import { nonNullable } from '@dxos/util';

import { Header } from './Header';
import { TodoFooter } from './TodoFooter';
import { TodoItem } from './TodoItem';
import { FILTER } from '../constants';
import { TodoListType, TodoType } from '../types';

export const Todos = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [editing, setEditing] = useState<string>();
  const { space } = useOutletContext<{ space: Space | undefined }>();
  const { state } = useParams();
  const completed = state === FILTER.ACTIVE ? false : state === FILTER.COMPLETED ? true : undefined;
  // TODO(wittjosiah): Support multiple lists in a single space.
  const [list] = useQuery<TodoListType>(space, Filter.schema(TodoListType));

  useEffect(() => {
    if (space && space.state.get() === SpaceState.READY && !list) {
      void space.db.add(create(TodoListType, { todos: [] }));
    }
  }, [space, list]);

  const allTodos = list?.todos ?? [];
  const todos = allTodos.filter((todo) => (completed !== undefined ? completed === !!todo?.completed : true));

  const handleNewTodoKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();

    const title = inputRef.current?.value.trim();
    if (title) {
      list.todos.push(create(TodoType, { title, completed: false }));
      inputRef.current!.value = '';
    }
  };

  const handleToggleAll = (event: ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    todos.filter(nonNullable).forEach((item) => {
      item.completed = checked;
    });
  };

  const handleClearCompleted = () => {
    list.todos
      .filter(nonNullable)
      .filter((item) => item.completed)
      .forEach((item) => {
        void space?.db.remove(item);
      });
  };

  const activeTodoCount = allTodos.reduce((acc, todo) => {
    return todo?.completed ? acc : acc + 1;
  }, 0);

  const completedCount = allTodos.length - activeTodoCount;

  return (
    <div>
      <Header onKeyDown={list && handleNewTodoKeyDown} ref={inputRef} />
      {todos.length > 0 && (
        <section className='main'>
          <input
            id='toggle-all'
            className='toggle-all'
            type='checkbox'
            onChange={handleToggleAll}
            checked={activeTodoCount === 0}
          />
          <label htmlFor='toggle-all' data-testid='toggle-all'>
            Mark all as complete
          </label>
          <ul className='todo-list'>
            {todos.filter(nonNullable).map((todo) => (
              <TodoItem
                key={todo.id}
                title={todo.title}
                completed={!!todo.completed}
                onToggle={() => (todo.completed = !todo.completed)}
                onDestroy={() => space?.db.remove(todo)}
                onEdit={() => setEditing(todo.id)}
                editing={editing === todo.id}
                onSave={(title) => {
                  todo.title = title;
                  setEditing(undefined);
                }}
                onCancel={() => setEditing(undefined)}
              />
            ))}
          </ul>
        </section>
      )}
      {(activeTodoCount > 0 || completedCount > 0) && (
        <TodoFooter
          count={activeTodoCount}
          completedCount={completedCount}
          nowShowing={state ?? FILTER.ALL}
          generatePath={(state = '') =>
            space ? generatePath('/:space/:state', { space: space.key.toHex(), state }) : '/'
          }
          onClearCompleted={handleClearCompleted}
        />
      )}
    </div>
  );
};
