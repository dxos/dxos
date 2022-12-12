//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Config } from '@dxos/client';
import { Dynamics, Defaults } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';

const App = () => {
  return (
    <ClientProvider
      config={async () => new Config(Defaults(), await Dynamics())}
      fallback={<div>Loading</div>}
    >
      {/* Your components can useClient() here  */}
    </ClientProvider>
  );
};
