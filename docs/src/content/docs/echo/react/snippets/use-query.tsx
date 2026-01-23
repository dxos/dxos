//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { Filter, Type } from '@dxos/echo';
import { ClientProvider } from '@dxos/react-client';
import { useDatabase, useQuery } from '@dxos/react-client/echo';

export const App = () => {
  const db = useDatabase();
  const tasks = useQuery(db, Filter.type(Type.Expando, { type: 'task' }));
  return (
    <>
      {tasks.map((task) => (
        <div key={task.id}>{task.title}</div>
      ))}
    </>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider>
    <App />
  </ClientProvider>,
);
