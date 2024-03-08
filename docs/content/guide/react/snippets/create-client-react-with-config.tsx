//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';
import { ClientProvider } from '@dxos/react-client';
import { Config } from '@dxos/client';
import { Dynamics, Defaults, Local } from '@dxos/config';

const App = () => {
  return (
    <ClientProvider
      config={async () => new Config(await Dynamics(), Local(), Defaults())}
    >
      {/* Your components here  */}
    </ClientProvider>
  );
};

createRoot(document.body).render(<App />);

