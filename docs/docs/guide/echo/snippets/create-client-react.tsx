//
// Copyright 2022 DXOS.org
//

import React, { createRoot } from 'react';
import { ClientProvider, useClient } from '@dxos/react-client';

const App = () => {
  const client = useClient();
  return <pre>{JSON.stringify(client.toJSON(), null, 2)}</pre>;
};

createRoot(document.body).render(
  <ClientProvider>
    <App />
  </ClientProvider>
);
