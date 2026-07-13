//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { Filter } from '@dxos/echo';
import { ClientProvider } from '@dxos/react-client';
import { useQuery, useSpaces } from '@dxos/react-client/echo';

import { Task } from './schema';

export const App = () => {
  const [space] = useSpaces();
  const tasks = useQuery(space?.db, Filter.type(Task));
  return (
    <>
      {tasks.map((task) => (
        <div key={task.id}>
          {task.name} - {task.completed}
        </div>
      ))}
    </>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider types={[Task]}>
    <App />
  </ClientProvider>,
);
