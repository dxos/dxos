//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { ClientProvider, Config, Space } from '@dxos/react-client';

import Demo from './Demo';
import { schema } from './proto';

const config = new Config({
  runtime: {
    client: {
      // CodeSandbox exposes local ports like this: https://b6x0h7-5173.csb.app/,
      // where "b6x0h7" is the sandbox ID and "5173" is the local port.
      remoteSource: window.location.origin.replace('5173', '3967') + '/vault.html',
    },
  },
});

const App = () => {
  const [space, setSpace] = useState<Space>();

  return (
    <ClientProvider
      config={config}
      onInitialized={async (client) => {
        // TODO(wittjosiah): Non-persistence not taking?
        client.halo.identity.get() || (await client.halo.createIdentity());
        client.addSchema(schema);
        const space = await client.createSpace();
        console.log({ space });
        setSpace(space);
      }}
    >
      {space && <Demo space={space} />}
    </ClientProvider>
  );
};

export default App;
