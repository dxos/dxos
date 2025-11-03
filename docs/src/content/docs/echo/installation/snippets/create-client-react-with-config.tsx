//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { Config } from '@dxos/client';
import { Defaults, Local } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';

const App = () => (
  <ClientProvider config={async () => new Config(Local(), Defaults())}>
    {/* Your components here  */}
  </ClientProvider>
);

createRoot(document.body).render(<App />);
