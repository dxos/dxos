//
// Copyright 2022 DXOS.org
//

import { Bug, ShareNetwork } from 'phosphor-react';
import React, { useEffect, useState } from 'react';

import { Client, fromHost } from '@dxos/client';
import { Config } from '@dxos/config';
import { EchoDatabase } from '@dxos/echo-db2';
import { ClientProvider } from '@dxos/react-client';
import { getSize } from '@dxos/react-ui';

import { DatabaseContext } from '../hooks';
import { ContactList } from './ContactList';
import { ProjectGraph } from './ProjectGraph';
import { ProjectList } from './ProjectList';
import { TaskList } from './TaskList';

export const App = () => {
  const [client, setClient] = useState<Client | undefined>(undefined);
  // const [spaceKey, setSpaceKey] = useState<PublicKey | undefined>(undefined);
  const [database, setDatabase] = useState<EchoDatabase | undefined>(undefined);

  // TODO(burdon): Factor out invitations for testing.
  useEffect(() => {
    setTimeout(async () => {
      const client = new Client({
        // services: fromHost(new Config(await Dynamics(), Defaults()))
        services: fromHost(new Config())
      });

      await client.initialize();
      // TODO(burdon): Hangs if profile not created.
      if (!client.halo.profile) {
        await client.halo.createProfile();
      }

      setClient(client);

      const space = await client.echo.createSpace();
      // setSpaceKey(space.key);
      setDatabase(new EchoDatabase(space.database));
    });
  }, []);

  /*
      let spaceKey: PublicKey | undefined;
      let swarmKey: PublicKey | undefined;
      try {
        const locationHash = location.hash;
        if (locationHash) {
          const [spaceKeyHex, swarmKeyHex] = locationHash.slice(1).split(':');
          spaceKey = PublicKey.from(spaceKeyHex);
          if (swarmKeyHex) {
            swarmKey = PublicKey.from(swarmKeyHex);
          }
        }
      } catch {}

      const initWithSpace = (space: Space) => {
        const swarmKey = PublicKey.random();
        const hostObservable = space.createInvitation({
          swarmKey,
          type: Invitation.Type.MULTIUSE_TESTING
        });
        hostObservable.subscribe({
          onConnecting: () => {},
          onConnected: () => {},
          onSuccess: (invitation) => {},
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

        // TODO(burdon): Remove timeout.
        try {
          return await complete.wait({ timeout: 10_000 });
        } catch {
          console.error('timeout');
          void observable.cancel();
          return false;
        }
      };

      if (spaceKey) {
        {
          const space = client.echo.getSpace(spaceKey);
          if (space) {
            initWithSpace(space);
            return;
          }
        }

        if (swarmKey) {
          const success = await join(swarmKey);
          if (success) {
            return;
          }
        }
      }

      const space = await client.echo.createSpace();
      initWithSpace(space);
    });
  }, []);
  */

  // if (!client || !spaceKey || !database) {
  if (!client || !database) {
    return null;
  }

  const columnWidth = 300;
  const sidebarWidth = 250;

  const Sidebar = () => {
    return (
      <div className='flex flex-1 flex-col bg-slate-700 text-white'>
        <div className='flex p-3 mb-2'>
          <div className='flex flex-1'>
            <Bug className={getSize(8)} />
            <div className='flex-1'></div>
            <div className='p-1'>
              <button>
                <ShareNetwork className={getSize(6)} />
              </button>
            </div>
          </div>
        </div>
        <div className='p-2 pl-4 bg-slate-600'>A</div>
        <div className='p-2 pl-4'>B</div>
        <div className='p-2 pl-4'>C</div>
      </div>
    );
  };

  return (
    <ClientProvider client={client}>
      <DatabaseContext.Provider value={{ database }}>
        <div className='full-screen'>
          <div className='flex' style={{ width: sidebarWidth }}>
            <Sidebar />
          </div>
          <div className='flex flex-1 overflow-x-scroll'>
            <div className='flex m-2'>
              <div className='flex m-2' style={{ width: columnWidth }}>
                <ProjectList />
              </div>
              <div className='flex m-2' style={{ width: columnWidth }}>
                <ContactList />
              </div>
              <div className='flex flex-col' style={{ width: columnWidth }}>
                <div className='flex flex-1 m-2'>
                  <TaskList />
                </div>
                <div className='flex flex-1 m-2'>
                  <TaskList completed={true} readonly />
                </div>
              </div>
              <div className='flex m-2' style={{ width: columnWidth * 2 }}>
                <ProjectGraph />
              </div>
            </div>
          </div>
        </div>
      </DatabaseContext.Provider>
    </ClientProvider>
  );
};
