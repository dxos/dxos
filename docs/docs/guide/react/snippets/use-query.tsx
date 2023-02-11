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
  id,
} from '@dxos/react-client';

type MyFoo = { id: string };

export const App = () => {
  useIdentity({ login: true });
  const space = useOrCreateFirstSpace();
  const tasks = useQuery(space, { type: 'task' });
  return <>
    {tasks?.map((item) => (
      <div key={item[id]}>{item.title}</div>
    ))}
  </>;
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider>
    <App />
  </ClientProvider>
);
