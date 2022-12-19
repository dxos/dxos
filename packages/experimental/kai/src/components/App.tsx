//
// Copyright 2022 DXOS.org
//

import React, { FC, useEffect, useMemo, useState } from 'react';

import { fromHost, Client, PublicKey } from '@dxos/client';
import { EchoDatabase, EchoObject } from '@dxos/echo-db2';
import { ClientProvider, useSpace } from '@dxos/react-client';

const List: FC<{ spaceKey: PublicKey }> = ({ spaceKey }) => {
  const space = useSpace(spaceKey);
  const db = useMemo(() => space && new EchoDatabase(space.database), [space]);
  if (!space) {
    return null;
  }

  // TODO(burdon): Not updated.
  const handleCreate = async () => {
    const obj = new EchoObject();
    await db?.save(obj);
  };

  console.log('Objects', db?.objects);

  return (
    <div>
      <pre>{space.key.truncate()}</pre>
      <div>
        {db?.objects.map((object: EchoObject) => (
          <div key={object._id}>{object._id}</div>
        ))}
      </div>
      <button onClick={handleCreate}>Create</button>
    </div>
  );
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
