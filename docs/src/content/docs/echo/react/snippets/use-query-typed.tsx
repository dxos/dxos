//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { ClientProvider } from '@dxos/react-client';
import { Filter, useDatabase, useQuery } from '@dxos/react-client/echo';

import { Task } from './schema';

export const App = () => {
  const db = useDatabase();
  const tasks = useQuery(db, Filter.type(Task));
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
