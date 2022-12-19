//
// Copyright 2022 DXOS.org
//

import React, { FC, useEffect, useMemo, useState } from 'react';

import { fromHost, Client, PublicKey } from '@dxos/client';
import { EchoDatabase } from '@dxos/echo-db2';
import { ClientProvider, useSpace } from '@dxos/react-client';

const List: FC<{ spaceKey: PublicKey }> = ({ spaceKey }) => {
  const space = useSpace(spaceKey);
  const db = useMemo(() => space && new EchoDatabase(space.database), [space]);
  if (!space) {
    return null;
  }

  console.log(':::', db);

  return <pre>{space.key.truncate()}</pre>;
};

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
          <List spaceKey={spaceKey} />
        </div>
      </ClientProvider>
    </div>
  );
};
