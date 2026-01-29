//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { Filter, Obj, Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { ClientProvider } from '@dxos/react-client';
import { useDatabase, useQuery } from '@dxos/react-client/echo';

export const App = () => {
  const db = useDatabase();
  const tasks = useQuery(db, Filter.type(TestSchema.Expando));
  return (
    <>
      {tasks.map((task) => (
        <div
          key={task.id}
          onClick={() => {
            Obj.change(task, (t) => {
              t.completed = true;
            });
          }}
        >
          {task.name} - {task.completed}
        </div>
      ))}
      <button
        name='add'
        onClick={() => {
          const task = Obj.make(TestSchema.Expando, {
            type: 'task',
            name: 'buy milk',
          });
          db?.add(task);
        }}
      >
        Add a task
      </button>
    </>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider>
    <App />
  </ClientProvider>,
);
