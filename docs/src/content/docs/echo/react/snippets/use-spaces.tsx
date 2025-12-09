//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { ClientProvider } from '@dxos/react-client';
import {
  Filter,
  parseId,
  useDatabase,
  useQuery,
  useSpaces,
} from '@dxos/react-client/echo';

export const App = () => {
  // Usually space IDs are in the URL like in params.spaceId.
  const { spaceId } = parseId('<space_id_param_goes_here>');
  const _space1 = useDatabase(spaceId);

  // Get all spaces.
  const spaces = useSpaces();
  const space2 = spaces.at(0);

  // Get objects from the space as an array of JS objects.
  const objects = useQuery(space2?.db, Filter.everything());

  return <>{objects.length}</>;
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider>
    <App />
  </ClientProvider>,
);
