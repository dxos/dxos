//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { Filter, Obj, Type } from '@dxos/echo';
import { ClientProvider } from '@dxos/react-client';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';

// TODO(burdon): Replace with better example.
export const App = () => {
  useIdentity();
  const [space] = useSpaces();
  const tasks = useQuery(space, Filter.type(Type.Expando));
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
          const task = Obj.make(Type.Expando, {
            type: 'task',
            name: 'buy milk',
          });
          space?.db.add(task);
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
