//
// Copyright 2022 DXOS.org
//

import React, { type ChangeEvent, type KeyboardEvent, useRef, useState } from 'react';
import { generatePath, useOutletContext, useParams } from 'react-router-dom';

import { Obj, Ref } from '@dxos/echo';
import { type Space, useObject, useObjects, useSpaceProperties } from '@dxos/react-client/echo';

import { FILTER } from '../constants';
import { Todo, TodoList } from '../types';

import { Header } from './Header';
import { TodoContainer } from './TodoContainer';
import { TodoFooter } from './TodoFooter';

export const Todos = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [editing, setEditing] = useState<string>();
  const { space } = useOutletContext<{ space?: Space }>();
  const { state } = useParams();
  const completed = state === FILTER.ACTIVE ? false : state === FILTER.COMPLETED ? true : undefined;

  // Get space properties with reactive updates (waits for space to be ready).
  const [spaceProperties] = useSpaceProperties(space?.id);

  // Get the TodoList reference from space.properties.
  const listRef = spaceProperties?.[TodoList.typename] as Ref.Ref<TodoList> | undefined;

  // Subscribe to the list ref (handles async loading and reactive updates).
  const [listSnapshot, updateList] = useObject(listRef);

  // Get all todo refs from the snapshot.
  const todoRefs = listSnapshot?.todos ?? [];

  // Get all loaded todos for computing counts using useObjects hook.
  const allTodos = useObjects(todoRefs);

  const handleNewTodoKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();

    const title = inputRef.current?.value.trim();
    if (title && listSnapshot && space) {
      const todo = Obj.make(Todo, { title, completed: false });
      space.db.add(todo);
      updateList((l) => {
        l.todos.push(Ref.make(todo));
      });
      inputRef.current!.value = '';
    }
  };

  const handleToggleAll = async (event: ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    await Promise.all(
      todoRefs.map(async (ref) => {
        const todo = await ref.load();
        if (todo.completed !== checked) {
          Obj.change(todo, (t) => {
            t.completed = checked;
          });
        }
      }),
    );
  };

  const handleClearCompleted = async () => {
    if (!listSnapshot) return;
    // Load all todos and find completed ones.
    const loadedTodos = await Promise.all(todoRefs.map((ref) => ref.load()));
    // Build set of ref DXNs to remove.
    const completedRefDxns = new Set<string>();
    for (let i = 0; i < todoRefs.length; i++) {
      if (loadedTodos[i]?.completed) completedRefDxns.add(todoRefs[i].dxn.toString());
    }

    // Remove completed refs from the list (splice from end so indices stay valid).
    updateList((l) => {
      for (let i = l.todos.length - 1; i >= 0; i--) {
        if (completedRefDxns.has(l.todos[i].dxn.toString())) l.todos.splice(i, 1);
      }
    });

    // Remove the objects from the database (no subscribers left).
    const completedTodos = loadedTodos.filter((todo) => todo.completed);
    completedTodos.forEach((item) => space?.db.remove(item));
  };

  const activeTodoCount = allTodos.reduce((acc, todo) => {
    return todo?.completed ? acc : acc + 1;
  }, 0);

  const completedCount = allTodos.length - activeTodoCount;

  return (
    <div data-testid={listSnapshot ? 'list' : 'placeholder'}>
      <Header onKeyDown={handleNewTodoKeyDown} ref={inputRef} />
      {todoRefs.length > 0 && (
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
            {todoRefs.map((ref) => (
              <TodoContainer
                key={ref.dxn.toString()}
                todo={ref}
                completedFilter={completed}
                editing={editing === ref.dxn.toString()}
                onEdit={() => setEditing(ref.dxn.toString())}
                onSave={() => setEditing(undefined)}
                onCancel={() => setEditing(undefined)}
                onDestroy={async () => {
                  const todo = await ref.load();
                  const dxn = ref.dxn.toString();
                  updateList((l) => {
                    const idx = l.todos.findIndex((r) => r.dxn.toString() === dxn);
                    if (idx !== -1) l.todos.splice(idx, 1);
                  });
                  space?.db.remove(todo);
                }}
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
          generatePath={(filterState = '') =>
            space ? generatePath('/:spaceProp/:state', { spaceProp: space.id, state: filterState }) : '/'
          }
          onClearCompleted={handleClearCompleted}
        />
      )}
    </div>
  );
};
