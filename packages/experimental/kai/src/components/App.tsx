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

const spaceKeyToSwarmKey = (spaceKey: PublicKey) => PublicKey.from(sha256(spaceKey.toHex()));

export const App = () => {
  const [client, setClient] = useState<Client | undefined>(undefined);
  const [spaceKey, setSpaceKey] = useState<PublicKey | undefined>(undefined);
  const [database, setDatabase] = useState<EchoDatabase | undefined>(undefined);

  // TODO(burdon): Factor out invitations for testing.
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
        const locationHash = location.hash;
        if (locationHash) {
          spaceKey = PublicKey.from(locationHash.slice(1));
        }
      } catch {}

      console.log('spaceKey', spaceKey);
      const createInvitationHost = (space: Space) => {
        const hostObservable = space.createInvitation({
          swarmKey: spaceKeyToSwarmKey(space.key),
          type: Invitation.Type.MULTIUSE_TESTING
        });
        hostObservable.subscribe({
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
      };

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

        const complete = new Trigger<boolean>();
        const observable = client.echo.acceptInvitation({
          swarmKey: spaceKeyToSwarmKey(spaceKey),
          type: Invitation.Type.MULTIUSE_TESTING,
          timeout: 2000, // TODO(dmaretskyi): Doesn't work.
          invitationId: PublicKey.random().toHex() // TODO(dmaretskyi): Why is this required?
        });

        observable.subscribe({
          onSuccess: async (invitation) => {
            const space = client.echo.getSpace(spaceKey!)!;
            setClient(client);
            setSpaceKey(space.key);
            setDatabase(new EchoDatabase(space.database));
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

        // TODO(burdon): Remove timeout.
        try {
          if (await complete.wait({ timeout: 10_000 })) {
            return;
          }
        } catch {
          console.error('timeout');
          void observable.cancel();
        }
      }

      const space = await client.echo.createSpace();
      createInvitationHost(space);
      location.hash = space.key.toHex();

      setClient(client);
      setSpaceKey(space.key);
      setDatabase(new EchoDatabase(space.database));
    });
  }, []);

  if (!client || !spaceKey || !database) {
    return null;
  }

  const colWidth = 360;

  // TODO(burdon): Context for database.
  return (
    <ClientProvider client={client}>
      <DatabaseContext.Provider value={{ database }}>
        <div className='full-screen'>
          <div className='flex flex-1 overflow-x-scroll'>
            <div className='flex p-4'>
              <div className='flex m-4' style={{ width: colWidth }}>
                <ProjectList />
              </div>
              <div className='flex m-4' style={{ width: colWidth }}>
                <TaskList />
              </div>
              <div className='flex m-4' style={{ width: colWidth }}>
                <ContactList />
              </div>
            </div>
          </div>
        </div>
      </DatabaseContext.Provider>
    </ClientProvider>
  );
};
