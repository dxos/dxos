//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { Filter, Obj } from '@dxos/echo';
import { ClientProvider } from '@dxos/react-client';
import { useDatabase, useQuery } from '@dxos/react-client/echo';

import { Task } from './schema';

export const App = () => {
  const db = useDatabase();
  const tasks = useQuery(db, Filter.type(Task));
  return (
    <>
      {tasks.map((task) => (
        <div
          key={task.id}
          onClick={() => {
            task.completed = true;
          }}
        >
          {task.name} - {task.completed}
        </div>
      ))}
      <button
        name='add'
        onClick={() => {
          const task = Obj.make(Task, { name: 'buy milk' });
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
  <ClientProvider types={[Task]}>
    <App />
  </ClientProvider>,
);
