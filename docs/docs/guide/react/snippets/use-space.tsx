//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { ClientProvider } from '@dxos/react-client';
import { useQuery, useSpace } from '@dxos/react-client/echo';

export const App = () => {
  // call useSpace without an argument to get the default space
  const defaultSpace = useSpace();

  // Get objects from the space as an array of JS objects.
  const objects = useQuery(defaultSpace);

  return <>{objects.length}</>;
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider>
    <App />
  </ClientProvider>,
);
