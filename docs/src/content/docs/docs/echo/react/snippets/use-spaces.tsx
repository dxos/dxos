//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { Filter } from '@dxos/echo';
import { ClientProvider } from '@dxos/react-client';
import { useQuery, useSpaces } from '@dxos/react-client/echo';

export const App = () => {
  // Get all spaces.
  const [space] = useSpaces();

  // Get objects from the space as an array of JS objects.
  const objects = useQuery(space?.db, Filter.everything());

  return <>{objects.length}</>;
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider>
    <App />
  </ClientProvider>,
);
