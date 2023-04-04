//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  ClientProvider,
  useIdentity,
  useQuery,
  useSpaces
} from '@dxos/react-client';

export const App = () => {
  useIdentity({ login: true });
  const [space] = useSpaces();
  const tasks = useQuery(space, { type: 'task' });
  return <>
    {tasks.map((task) => (
      <div key={task.id}>{task.title}</div>
    ))}
  </>;
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider>
    <App />
  </ClientProvider>
);
