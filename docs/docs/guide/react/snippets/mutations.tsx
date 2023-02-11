//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  ClientProvider,
  useOrCreateFirstSpace,
  useIdentity,
  useQuery,
  Document,
  id,
} from '@dxos/react-client';

export const App = () => {
  useIdentity({ login: true });
  const space = useOrCreateFirstSpace();
  const tasks = useQuery(space, { type: 'task' });
  return <>
    {tasks?.map((task) => (
      <div key={task[id]} onClick={() => {
        task.completed = true;
      }}>{task.title} - {task.completed}</div>
    ))}
    <button name="add" onClick={() => {
      const task = new Document({ title: 'buy milk' });
      space.experimental.db.save(task);
    }}>Add a task</button>
  </>;
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider>
    <App />
  </ClientProvider>
);
