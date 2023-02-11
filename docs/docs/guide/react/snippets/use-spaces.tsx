//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Space } from '@dxos/client';
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
  
  // get items from the space as an array of JS objects
  const items = useQuery(space3);

  return <>{items?.length}</>;
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider>
    <App />
  </ClientProvider>
);
