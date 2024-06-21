//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { ClientProvider } from '@dxos/react-client';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';

import { Task, types } from './schema';

export const App = () => {
  useIdentity();
  const [space] = useSpaces();
  const tasks: Task[] = useQuery(space, Task.filter());
  return (
    <>
      {tasks.map((task) => (
        <div key={task.id}>
          {task.title} - {task.completed}
        </div>
      ))}
    </>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider
    onInitialized={async (client) => {
      client.addTypes(types);
    }}
  >
    <App />
  </ClientProvider>,
);
