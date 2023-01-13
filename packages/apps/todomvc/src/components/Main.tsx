//
// Copyright 2022 DXOS.org
//

import React, { ChangeEvent, KeyboardEvent, useCallback, useRef, useState } from 'react';
import { useParams, useOutletContext, generatePath } from 'react-router-dom';

import { Invitation, InvitationEncoder, Item, ObjectModel, Space } from '@dxos/client';
import { useSelection } from '@dxos/react-client';

import { ACTIVE_TODOS, ALL_TODOS, COMPLETED_TODOS, Todo, TODO_TYPE } from '../model';
import { TodoFooter } from './TodoFooter';
import { TodoItem } from './TodoItem';

export const Main = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { space, item } = useOutletContext<{
    space: Space;
    item: Item<ObjectModel>;
  }>();
  const todoItems = useSelection<Item<ObjectModel>>(item.select().children().filter({ type: TODO_TYPE })) ?? [];
  const todos = todoItems.map((item) => ({
    id: item.id,
    title: item.model.get('title'),
    completed: item.model.get('completed')
  }));
  const { state } = useParams();
  const nowShowing = state === 'active' ? ACTIVE_TODOS : state === 'completed' ? COMPLETED_TODOS : ALL_TODOS;
  const [editing, setEditing] = useState<string>();

  const handleNewTodoKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Enter') {
        return;
      }

      event.preventDefault();

      const val = inputRef.current?.value.trim();
      if (val) {
        void space.database.createItem({
          model: ObjectModel,
          type: TODO_TYPE,
          parent: item.id,
          props: {
            title: val
          }
        });
        inputRef.current!.value = '';
      }
    },
    [inputRef, space]
  );

  const handleToggle = useCallback(
    (todo: Todo) => {
      const item = todoItems.find((item) => item.id === todo.id);
      void item?.model.set('completed', !todo.completed);
    },
    [todoItems]
  );

  const handleDestroy = useCallback(
    (todo: Todo) => {
      const item = todoItems.find((item) => item.id === todo.id);
      // TODO(wittjosiah): Item deletion is not working.
      void item?.delete();
    },
    [todoItems]
  );

  const handleSave = useCallback(
    (todo: Todo, val: string) => {
      const item = todoItems.find((item) => item.id === todo.id);
      void item?.model.set('title', val);
      setEditing(undefined);
    },
    [todoItems]
  );

  const handleShare = useCallback(async () => {
    const { invitation } = await space.createInvitation({ type: Invitation.Type.INTERACTIVE_TESTING });
    const code = InvitationEncoder.encode(invitation!);
    await navigator.clipboard.writeText(code);
  }, [space]);

  const handleToggleAll = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const checked = event.target.checked;
      todoItems.forEach((item) => {
        void item.model.set('completed', checked);
      });
    },
    [todoItems]
  );

  const handleClearCompleted = useCallback(() => {
    todoItems
      .filter((item) => item.model.get('completed'))
      .forEach((item) => {
        void item.delete();
      });
  }, [todoItems]);

  const shownTodos = todos.filter((todo) => {
    switch (nowShowing) {
      case ACTIVE_TODOS:
        return !todo.completed;
      case COMPLETED_TODOS:
        return todo.completed;
      default:
        return true;
    }
  });

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
            {shownTodos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={() => handleToggle(todo)}
                onDestroy={() => handleDestroy(todo)}
                onEdit={() => setEditing(todo.id)}
                editing={editing === todo.id}
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
          nowShowing={nowShowing}
          generatePath={(state = '') => generatePath('/:space/:state', { space: space.key.toHex(), state })}
          onClearCompleted={handleClearCompleted}
        />
      )}
    </div>
  );
};
