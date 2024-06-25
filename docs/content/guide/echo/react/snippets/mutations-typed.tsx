//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { ClientProvider } from '@dxos/react-client';
import { Filter, create, useQuery, useSpaces } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';

import { TaskType } from './schema';

export const App = () => {
  useIdentity();
  const [space] = useSpaces();
  const tasks = useQuery(space, Filter.schema(TaskType));
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
          const task = create(TaskType, { name: 'buy milk' });
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
  <ClientProvider
    onInitialized={async (client) => {
      client.addTypes([TaskType]);
    }}
  >
    <App />
  </ClientProvider>,
);
