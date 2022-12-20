//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { fromHost, Client, PublicKey } from '@dxos/client';
import { EchoDatabase } from '@dxos/echo-db2';
import { ClientProvider } from '@dxos/react-client';

import { ContactList } from './ContactList';
import { TaskList } from './TaskList';
import { ProjectList } from './ProjectList';

export const App = () => {
  const [client, setClient] = useState<Client | undefined>(undefined);
  const [spaceKey, setSpaceKey] = useState<PublicKey | undefined>(undefined);
  const [database, setDatabase] = useState<EchoDatabase | undefined>(undefined);
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
      setDatabase(new EchoDatabase(space.database));
    });
  }, []);

  if (!client || !spaceKey || !database) {
    return null;
  }

  // TODO(burdon): Tailwind.
  return (
    <div>
      <ClientProvider client={client}>
        <div>
          <h1>Kai</h1>
          <div style={{ display: 'flex', flexDirection: 'row' }}>
            <div style={{ flex: 1 }}>
              <ProjectList database={database} spaceKey={spaceKey} />
            </div>
            <div style={{ flex: 1 }}>
              <TaskList database={database} spaceKey={spaceKey} />
            </div>
            <div style={{ flex: 1 }}>
              <ContactList database={database} spaceKey={spaceKey} />
            </div>
          </div>
        </div>
      </ClientProvider>
    </div>
  );
};
