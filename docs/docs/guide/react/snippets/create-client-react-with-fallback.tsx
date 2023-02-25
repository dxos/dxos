//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Client } from '@dxos/client';
import { ClientProvider } from '@dxos/react-client';
import { GenericFallback } from '@dxos/react-appkit';

const client = new Client();

const App = () => {
  return (
    <ClientProvider client={client} fallback={GenericFallback}>
      {/* ... */}
    </ClientProvider>
  );
};

createRoot(document.body).render(<App />);