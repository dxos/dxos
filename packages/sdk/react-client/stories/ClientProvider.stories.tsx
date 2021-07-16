//
// Copyright 2020 DXOS.org
//

import React, { useState, useEffect } from 'react';

import { Client } from '@dxos/client';
import { createKeyPair } from '@dxos/crypto';
import { Party } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

import { ClientProvider, useClient, useItems, useParties, useProfile } from '../src';

const Test = () => {
  const client = useClient();
  const parties = useParties();
  const profile = useProfile();
  return (
    <div>
      <h1>Client</h1>
      <pre>{JSON.stringify(client.config)}</pre>
      <pre>{JSON.stringify(profile)}</pre>
      <button onClick={() => client.halo.createProfile({ ...createKeyPair(), username: 'foo' })}>Create profile</button>
      <button onClick={() => client.createParty()}>Create party</button>
      {parties.map((party: any) => <PartyView key={party.key.toString()} party={party} />)}
    </div>
  );
};

// TODO(burdon): Merge with echo-demo.
const PartyView = ({ party }: { party: Party }) => {
  const items = useItems({ partyKey: party.key }) as any;

  return (
    <div>
      <p>{party.key.toString()}</p>
      <button onClick={() => party.database.createItem({ model: ObjectModel })}>Create item</button>
      <ul>
        {items.map((item: any) => <li key={item.id}>{item.id}</li>)}
      </ul>
    </div>
  );
};

export default {
  title: 'ClientProvider'
};

export const InMemory = () => {
  const [client, setClient] = useState<Client | undefined>();

  useEffect(() => {
    setImmediate(async () => {
      const client = new Client();
      await client.initialize();
      setClient(client);
    });
  }, []);

  return client
    ? (
      <ClientProvider client={client}>
        <Test />
      </ClientProvider>
    ) : (
      <div>Loading...</div>
    );
};

export const Persistent = () => {
  const [client, setClient] = useState<Client | undefined>();

  useEffect(() => {
    setImmediate(async () => {
      const client = new Client({
        storage: {
          persistent: true
        },
        snapshots: true,
        snapshotInterval: 10
      });
      await client.initialize();
      setClient(client);
    });
  }, []);

  return client
    ? (
      <ClientProvider client={client}>
        <Test />
      </ClientProvider>
    ) : (
      <div>Loading...</div>
    );
};
