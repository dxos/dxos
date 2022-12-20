//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { fromHost, Client, PublicKey } from '@dxos/client';
import { ClientProvider } from '@dxos/react-client';

import { TaskList } from './TaskList';

export const App = () => {
  const [client, setClient] = useState<Client | undefined>(undefined);
  const [spaceKey, setSpaceKey] = useState<PublicKey | undefined>(undefined);
  useEffect(() => {
    setTimeout(async () => {
      const client = new Client({
        services: fromHost()
      });

      await client.initialize();
      // TODO(burdon): Hangs if profile not created.
      await client.halo.createProfile();
      const space = await client.echo.createSpace();

      setClient(client);
      setSpaceKey(space.key);
    });
  }, []);

  if (!client || !spaceKey) {
    return null;
  }

  return (
    <div>
      <ClientProvider client={client}>
        <div>
          <h1>Kai</h1>
          <TaskList spaceKey={spaceKey} />
        </div>
      </ClientProvider>
    </div>
  );
};
