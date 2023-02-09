//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  ClientProvider,
  useClient,
  useIdentity,
  useOrCreateFirstSpace,
  useQuery,
  id
} from '@dxos/react-client';

const Component = () => {
  // get a client instance
  const client = useClient();
  // get the user to log in before a space can be obtained
  const identity = useIdentity({ login: true });
  // create or use the first space
  const space = useOrCreateFirstSpace();
  // grab everything in the space
  const objects = useQuery(space, {});
  // show the id of the first object returned
  return <>{objects?.[0]?.[id]}</>;
};

const App = () => (
  <ClientProvider>
    <Component />
  </ClientProvider>
);

createRoot(document.body).render(<App />);
