//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  ClientProvider,
  useSpaces,
  useSpace,
  useOrCreateFirstSpace,
  useQuery,
  id
} from '@dxos/react-client';

export const App = () => {
  // usually space IDs are in the URL like in params.id: 
  const space1 = useSpace('<space_key_goes_here>');
  
  // get all spaces
  const spaces = useSpaces();
  const space2 = spaces?.[0]; // spaces may be null at first
  
  // get or create a first space:
  const space3 = useOrCreateFirstSpace();
  
  // get objects from the space as an array of JS objects
  const objects = useQuery(space3);

  return <>{objects?.length}</>;
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider>
    <App />
  </ClientProvider>
);
