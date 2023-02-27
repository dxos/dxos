//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  ClientProvider,
  useOrCreateFirstSpace,
  useIdentity,
  useQuery
} from '@dxos/react-client';

import { Task } from './schema';

export const App = () => {
  useIdentity({ login: true });
  const space = useOrCreateFirstSpace();
  const tasks = useQuery<Task>(space, Task.filter());
  return <>
    {tasks?.map((task) => (
      <div key={task.id}>{task.title} - {task.completed}</div>
    ))}
  </>;
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider>
    <App />
  </ClientProvider>
);
