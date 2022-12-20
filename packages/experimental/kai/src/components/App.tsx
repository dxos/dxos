//
// Copyright 2022 DXOS.org
//

import { DatabaseContext } from 'packages/experimental/kai/src/hooks';
import React, { useEffect, useState } from 'react';

import { fromHost, Client, PublicKey } from '@dxos/client';
import { EchoDatabase } from '@dxos/echo-db2';
import { ClientProvider } from '@dxos/react-client';

import { ContactList } from './ContactList';
import { ProjectList } from './ProjectList';
import { TaskList } from './TaskList';

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

  // TODO(burdon): Context for database.
  return (
    <ClientProvider client={client}>
      <DatabaseContext.Provider value={{ database }}>
        <div className='full-screen'>
          <div className='flex flex-1 p-3'>
            <div className='flex flex-1 m-2'>
              <ProjectList />
            </div>
            <div className='flex flex-1 m-2'>
              <TaskList />
            </div>
            <div className='flex flex-1 m-2'>
              <ContactList />
            </div>
          </div>
        </div>
      </DatabaseContext.Provider>
    </ClientProvider>
  );
};
