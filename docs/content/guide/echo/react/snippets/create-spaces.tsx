//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { ClientProvider, useClient } from '@dxos/react-client';

export const App = () => {
  const client = useClient();
  return (
    <button
      onClick={async () => {
        const space = await client.spaces.create();
      }}
    ></button>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider>
    <App />
  </ClientProvider>,
);
