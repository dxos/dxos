//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Trigger } from '@dxos/async';
import { fromHost, Client, PublicKey, Invitation, Config, Space } from '@dxos/client';
import { Dynamics, Defaults } from '@dxos/config';
import { sha256 } from '@dxos/crypto';
import { EchoDatabase } from '@dxos/echo-db2';
import { ClientProvider } from '@dxos/react-client';

import { DatabaseContext } from '../hooks';
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
        services: fromHost(new Config(await Dynamics(), Defaults()))
      });

      await client.initialize();
      // TODO(burdon): Hangs if profile not created.
      if (!client.halo.profile) {
        await client.halo.createProfile();
      }

      let spaceKey: PublicKey | undefined;
      let swarmKey: PublicKey | undefined;
      try {
        const locationHash = location.hash;
        if (locationHash) {
          const [spaceKeyHex, swarmKeyHex] = locationHash.slice(1).split(':');
          spaceKey = PublicKey.from(spaceKeyHex);
          if(swarmKeyHex) {
            swarmKey = PublicKey.from(swarmKeyHex);
          }
        }
      } catch {}

      console.log('spaceKey', spaceKey);

      const initWithSpace = (space: Space) => {
        const swarmKey = PublicKey.random();
        const hostObs = space.createInvitation({
          swarmKey,
          type: Invitation.Type.MULTIUSE_TESTING
        });
        hostObs.subscribe({
          onConnecting: () => {
            console.log('connecting');
          },
          onConnected: () => {
            console.log('connected');
          },
          onSuccess: (invitation) => {
            console.log('success');
          },
          onError: (error) => {
            console.error(error);
          }
        });
        location.hash = `${space.key.toHex()}:${swarmKey.toHex()}`;
        setClient(client);
        setSpaceKey(space.key);
        setDatabase(new EchoDatabase(space.database));
      };

      const join = async (swarmKey: PublicKey): Promise<boolean> => {
        const complete = new Trigger<boolean>();
        const observable = client.echo.acceptInvitation({
          swarmKey,
          type: Invitation.Type.MULTIUSE_TESTING,
          timeout: 2000, // TODO(dmaretskyi): Doesn't work.
          invitationId: PublicKey.random().toHex() // TODO(dmaretskyi): Why is this required?
        });
        observable.subscribe({
          onSuccess: async (invitation) => {
            const space = client.echo.getSpace(spaceKey!)!;
            initWithSpace(space);
            complete.wake(true);
          },
          onTimeout: () => {
            console.error('timeout');
            complete.wake(false);
          },
          onError: (error) => {
            console.error(error);
            complete.wake(false);
          }
        });

        try {
          return await complete.wait({ timeout: 10_000 })
        } catch {
          console.error('timeout');
          void observable.cancel();
          return false;
        }
      }

      if (spaceKey) {
        {
          const space = client.echo.getSpace(spaceKey);
          if (space) {
            initWithSpace(space);
            return;
          }
        }

        if(swarmKey) {
          const success = await join(swarmKey);
          if(success) {
            return;
          }
        }
      }

      const space = await client.echo.createSpace();
      initWithSpace(space);

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
