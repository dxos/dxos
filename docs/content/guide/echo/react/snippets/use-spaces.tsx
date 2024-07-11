//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { ClientProvider } from '@dxos/react-client';
import {
  type Space,
  useQuery,
  useSpace,
  useSpaces,
} from '@dxos/react-client/echo';

export const App = () => {
  // Usually space IDs are in the URL like in params.spaceKey.
  const space1 = useSpace('<space_key_goes_here>');

  // Get all spaces.
  const spaces = useSpaces();
  const space2: Space | undefined = spaces[0]; // Spaces may be an empty list.

  // Get objects from the space as an array of JS objects.
  const objects = useQuery(space2);

  return <>{objects.length}</>;
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider>
    <App />
  </ClientProvider>,
);
