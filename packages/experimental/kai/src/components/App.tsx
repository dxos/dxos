//
// Copyright 2022 DXOS.org
//

import { DatabaseContext } from '../hooks';
import React, { useEffect, useState } from 'react';

import { fromHost, Client, PublicKey, Invitation, Config, Space } from '@dxos/client';
import { Dynamics, Defaults } from '@dxos/config'
import { EchoDatabase } from '@dxos/echo-db2';
import { ClientProvider } from '@dxos/react-client';

import { ContactList } from './ContactList';
import { ProjectList } from './ProjectList';
import { TaskList } from './TaskList';
import { sha256 } from '@dxos/crypto';
import { Trigger } from '@dxos/async'

const spaceKeyToSwarmKey = (spaceKey: PublicKey) => PublicKey.from(sha256(spaceKey.toHex()));

export const App = () => {
  const [client, setClient] = useState<Client | undefined>(undefined);
  const [spaceKey, setSpaceKey] = useState<PublicKey | undefined>(undefined);
  const [database, setDatabase] = useState<EchoDatabase | undefined>(undefined);
  useEffect(() => {
    setTimeout(async () => {
      const client = new Client({
        services: fromHost(new Config(await Dynamics(), Defaults()))
      });

      await client.initialize();
      // TODO(burdon): Hangs if profile not created.
      if (!client.halo.profile) {
        await client.halo.createProfile();
      }

      let spaceKey: PublicKey | undefined;
      try {
        const locationHash = location.hash
        if (locationHash) {
          spaceKey = PublicKey.from(locationHash.slice(1));
        }
      } catch { }

      console.log('spaceKey', spaceKey)

      function createInvitationHost(space: Space) {
        const hostObs = space.createInvitation({
          swarmKey: spaceKeyToSwarmKey(space.key),
          type: Invitation.Type.MULTIUSE_TESTING,
        })
        hostObs.subscribe({
          onConnecting: () => {
            console.log('connecting')
          },
          onConnected: () => {
            console.log('connected')
          },
          onSuccess: (invitation) => {
            console.log('success')
          },
          onError: (error) => {
            console.error(error)
          }
        })
      }

      if (spaceKey) {
        {
          const space = client.echo.getSpace(spaceKey);
          if (space) {
            createInvitationHost(space);
            location.hash = space.key.toHex();
            setClient(client);
            setSpaceKey(space.key);
            setDatabase(new EchoDatabase(space.database));
            return;
          }
        }


        const complete = new Trigger<boolean>()
        const observable = client.echo.acceptInvitation({
          swarmKey: spaceKeyToSwarmKey(spaceKey),
          type: Invitation.Type.MULTIUSE_TESTING,
          timeout: 2000, // TODO(dmaretskyi): Doesn't work.
          invitationId: PublicKey.random().toHex(), // TODO(dmaretskyi): Why is this required?
        })
        observable.subscribe({
          onSuccess: async (invitation) => {
            const space = client.echo.getSpace(spaceKey!)!;
            setClient(client);
            setSpaceKey(space.key);
            setDatabase(new EchoDatabase(space.database));
            complete.wake(true)

          },
          onTimeout: () => {
            console.error('timeout')
            complete.wake(false)
          },
          onError: (error) => {
            console.error(error)
            complete.wake(false)
          }
        })

        try {
          if (await complete.wait({ timeout: 10_000 })) {
            return
          }
        } catch {
          console.error('timeout')
          observable.cancel();
        }
      }

      const space = await client.echo.createSpace();
      createInvitationHost(space);
      location.hash = space.key.toHex();
      setClient(client);
      setSpaceKey(space.key);
      setDatabase(new EchoDatabase(space.database));
    })
  }, []);

  if (!client || !spaceKey || !database) {
    return null;
  }

  // TODO(burdon): Context for database.
  return (
    <ClientProvider client={client}>
      <DatabaseContext.Provider value={{ database }}>
        <div className='full-screen'>
          <div className='flex flex-1 p-4'>
            <div className='flex flex-1 m-4'>
              <ProjectList />
            </div>
            <div className='flex flex-1 m-4'>
              <TaskList />
            </div>
            <div className='flex flex-1 m-4'>
              <ContactList />
            </div>
          </div>
        </div>
      </DatabaseContext.Provider>
    </ClientProvider>
  );
};
