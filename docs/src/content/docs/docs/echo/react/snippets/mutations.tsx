//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { Filter, Obj } from '@dxos/echo';
import { ClientProvider } from '@dxos/react-client';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Expando } from '@dxos/schema';

export const App = () => {
  const [space] = useSpaces();
  const tasks = useQuery(space?.db, Filter.type(Expando.Expando));
  return (
    <>
      {tasks.map((task) => (
        <div
          key={task.id}
          onClick={() => {
            Obj.update(task, (task) => {
              task.completed = true;
            });
          }}
        >
          {task.name} - {task.completed}
        </div>
      ))}
      <button
        name='add'
        onClick={() => {
          const task = Obj.make(Expando.Expando, {
            type: 'task',
            name: 'buy milk',
          });
          space?.db?.add(task);
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
