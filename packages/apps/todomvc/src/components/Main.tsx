//
// Copyright 2022 DXOS.org
//

import React, { ChangeEvent, KeyboardEvent, useRef, useState } from 'react';
import { useParams, useOutletContext, generatePath } from 'react-router-dom';

import { Invitation, InvitationEncoder, Space } from '@dxos/client';
import { useQuery, withReactor } from '@dxos/react-client';

import { FILTER } from '../constants';
import { Todo, TodoList } from '../proto';
import { TodoFooter } from './TodoFooter';
import { TodoItem } from './TodoItem';

export const Main = withReactor(() => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [editing, setEditing] = useState<string>();
  const { space } = useOutletContext<{ space: Space }>();
  const { state } = useParams();
  const completed = state === FILTER.ACTIVE ? false : state === FILTER.COMPLETED ? true : undefined;
  // TODO(wittjosiah): Support multiple lists in a single space.
  const [list] = useQuery(space, TodoList.filter());

  if (!list) {
    return null;
  }

  // TODO(wittjosiah): Hide deleted items from `useQuery`?
  const allTodos = list.todos.filter((todo) => !todo.__deleted);
  const todos = allTodos.filter((todo) => (completed !== undefined ? completed === !!todo.completed : true));

  const handleNewTodoKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();

    const title = inputRef.current?.value.trim();
    if (title) {
      list.todos.push(new Todo({ title }));
      inputRef.current!.value = '';
    }
  };

  const handleShare = async () => {
    space.createInvitation({ type: Invitation.Type.INTERACTIVE_TESTING }).subscribe({
      onConnecting: (invitation) => {
        const invitationCode = InvitationEncoder.encode(invitation);
        // TODO(wittjosiah): Playwright only supports reading clipboard in chromium.
        //   https://github.com/microsoft/playwright/issues/13037
        console.log(JSON.stringify({ invitationCode }));
        void navigator.clipboard.writeText(invitationCode);
      },
      onError: (error) => console.error(error),
      onSuccess: (invitation) => {}
    });
  };

  const handleToggleAll = (event: ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    todos.forEach((item) => {
      item.completed = checked;
    });
  };

  const handleClearCompleted = () => {
    list.todos
      .filter((item) => item.completed)
      .forEach((item) => {
        void space.db.remove(item);
      });
  };

  const activeTodoCount = allTodos.reduce((acc, todo) => {
    return todo.completed ? acc : acc + 1;
  }, 0);

  const completedCount = allTodos.length - activeTodoCount;

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
          data-testid='new-todo'
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
          <label htmlFor='toggle-all' data-testid='toggle-all'>
            Mark all as complete
          </label>
          <button id='share' onClick={handleShare} data-testid='share-button'>
            Share
          </button>
          <ul className='todo-list'>
            {todos.map((todo) => (
              <TodoItem
                key={todo.id}
                title={todo.title}
                completed={!!todo.completed}
                onToggle={() => (todo.completed = !todo.completed)}
                onDestroy={() => space.db.remove(todo)}
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
          generatePath={(state = '') => generatePath('/:space/:state', { space: space.key.toHex(), state })}
          onClearCompleted={handleClearCompleted}
        />
      )}
    </div>
  );
});
