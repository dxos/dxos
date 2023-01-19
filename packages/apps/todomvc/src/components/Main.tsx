//
// Copyright 2022 DXOS.org
//

import React, { ChangeEvent, KeyboardEvent, useCallback, useRef, useState } from 'react';
import { useParams, useOutletContext, generatePath } from 'react-router-dom';

import { Invitation, InvitationEncoder, Space } from '@dxos/client';
import { useQuery } from '@dxos/react-client';

import { ACTIVE_TODOS, ALL_TODOS, COMPLETED_TODOS } from '../constants';
import { Todo, TodoList } from '../proto';
import { TodoFooter } from './TodoFooter';
import { TodoItem } from './TodoItem';

export const Main = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { space } = useOutletContext<{ space: Space }>();
  const { state } = useParams();
  const completed = state === ACTIVE_TODOS ? false : state === COMPLETED_TODOS ? true : undefined;
  // TODO(wittjosiah): Support multiple lists in a single space.
  const [list] = useQuery(space, TodoList.filter());
  console.log({ spaceKey: space.key.toHex(), list });
  const todos = list?.todos?.filter((todo) => completed === todo.completed) ?? [];
  const [editing, setEditing] = useState<string>();

  const handleNewTodoKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Enter') {
        return;
      }

      event.preventDefault();

      const title = inputRef.current?.value.trim();
      if (title) {
        void space.experimental.db.save(new Todo({ title }));
        inputRef.current!.value = '';
      }
    },
    [inputRef, space]
  );

  const handleToggle = useCallback(
    (todo: Todo) => {
      todo.completed = !todo.completed;
    },
    [todos]
  );

  const handleDestroy = useCallback(
    (todo: Todo) => {
      void space.experimental.db.delete(todo);
    },
    [space, todos]
  );

  const handleSave = useCallback(
    (todo: Todo, val: string) => {
      todo.title = val;
      setEditing(undefined);
    },
    [todos]
  );

  const handleShare = useCallback(async () => {
    const { invitation } = await space.createInvitation({ type: Invitation.Type.INTERACTIVE_TESTING });
    const code = InvitationEncoder.encode(invitation!);
    await navigator.clipboard.writeText(code);
  }, [space]);

  const handleToggleAll = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const checked = event.target.checked;
      todos.forEach((item) => {
        item.completed = checked;
      });
    },
    [todos]
  );

  const handleClearCompleted = useCallback(() => {
    todos
      .filter((item) => item.completed)
      .forEach((item) => {
        void space.experimental.db.delete(item);
      });
  }, [space, todos]);

  const activeTodoCount = todos.reduce((acc, todo) => {
    return todo.completed ? acc : acc + 1;
  }, 0);

  const completedCount = todos.length - activeTodoCount;

  return (
    <div>
      <header className='header'>
        <h1>todos</h1>
        <input
          ref={inputRef}
          className='new-todo'
          placeholder='What needs to be done?'
          onKeyDown={handleNewTodoKeyDown}
          autoFocus={true}
        />
      </header>
      {todos.length > 0 && (
        <section className='main'>
          <input
            id='toggle-all'
            className='toggle-all'
            type='checkbox'
            onChange={handleToggleAll}
            checked={activeTodoCount === 0}
          />
          <label htmlFor='toggle-all'>Mark all as complete</label>
          <button id='share' onClick={handleShare}>
            Share
          </button>
          <ul className='todo-list'>
            {todos.map((todo) => (
              <TodoItem
                key={todo._id}
                todo={todo}
                onToggle={() => handleToggle(todo)}
                onDestroy={() => handleDestroy(todo)}
                onEdit={() => setEditing(todo._id)}
                editing={editing === todo._id}
                onSave={(val) => handleSave(todo, val)}
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
          nowShowing={state ?? ALL_TODOS}
          generatePath={(state = '') => generatePath('/:space/:state', { space: space.key.toHex(), state })}
          onClearCompleted={handleClearCompleted}
        />
      )}
    </div>
  );
};
