//
// Copyright 2022 DXOS.org
//

import { ClientProvider } from '@dxos/react-client';
import { Expando, useQuery, useSpaces } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import React from 'react';
import { createRoot } from 'react-dom/client';

export const App = () => {
  useIdentity();
  const [space] = useSpaces();
  const tasks = useQuery(space, { type: 'task' });
  return (
    <>
      {tasks.map((task) => (
        <div
          key={task.id}
          onClick={() => {
            task.completed = true;
          }}
        >
          {task.title} - {task.completed}
        </div>
      ))}
      <button
        name="add"
        onClick={() => {
          const task = create(Expando, { title: 'buy milk' });
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
  </ClientProvider>
);
