//
// Copyright 2024 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { ClientProvider } from '@dxos/react-client';
import { Filter, useDatabase, useQuery } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';

const createWorker = () =>
  new SharedWorker(new URL('../shared-worker', import.meta.url), {
    type: 'module',
    name: 'dxos-client-worker',
  });

const Component = () => {
  // Get the user to log in before a space can be obtained.
  const _identity = useIdentity();
  // Get the database of the default space, created with the identity.
  const db = useDatabase();
  // Grab everything in the space.
  const objects = useQuery(db, Filter.everything());
  // Show the id of the first object returned.
  return <>{objects[0]?.id}</>;
};

const App = () => (
  <ClientProvider createWorker={createWorker}>
    <Component />
  </ClientProvider>
);

createRoot(document.body).render(<App />);
