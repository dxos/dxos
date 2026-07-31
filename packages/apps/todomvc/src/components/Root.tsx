//
// Copyright 2022 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import * as Registry from '@effect-atom/atom/Registry';
import React, { useMemo } from 'react';
import { generatePath, useNavigate } from 'react-router-dom';

import { Config, defs } from '@dxos/config';
import { ClientProvider, createClientServices } from '@dxos/react-client';

import { getConfig } from '../config';
import { Todo, TodoList, createTodoList } from '../types';
import { Main } from './Main';

// Dedicated-worker client services. A coordinator SharedWorker elects a single leader tab that owns
// the dedicated Worker hosting the ECHO services; follower tabs proxy through it.
const createServices = (config?: Config) =>
  createClientServices(
    new Config(
      { runtime: { client: { servicesMode: defs.Runtime.Client.ServicesMode.DEDICATED_WORKER } } },
      ...(config ? [config.values] : []),
    ),
    {
      createDedicatedWorker: () =>
        new Worker(new URL('@dxos/client/dedicated-worker', import.meta.url), {
          type: 'module',
          name: 'dxos-client-worker',
        }),
      createCoordinatorWorker: () =>
        new SharedWorker(new URL('@dxos/client/coordinator-worker', import.meta.url), {
          type: 'module',
          name: 'dxos-coordinator-worker',
        }),
    },
  );

export const Root = () => {
  const navigate = useNavigate();
  const registry = useMemo(() => Registry.make(), []);

  return (
    <ClientProvider
      config={getConfig}
      services={createServices}
      shell='./shell.html'
      types={[TodoList, Todo]}
      onInitialized={async (client) => {
        const searchProps = new URLSearchParams(location.search);
        const deviceInvitationCode = searchProps.get('deviceInvitationCode');
        if (!client.halo.identity.get() && !deviceInvitationCode) {
          await client.halo.createIdentity();
          const space = await client.spaces.create();
          await space.waitUntilReady();
          createTodoList(space);
        }

        const spaceInvitationCode = searchProps.get('spaceInvitationCode');
        if (spaceInvitationCode) {
          void client.shell.joinSpace({ invitationCode: spaceInvitationCode }).then(({ space }) => {
            space && navigate(generatePath('/:spaceKey', { spaceKey: space.key.toHex() }));
          });
        } else if (deviceInvitationCode) {
          void client.shell.joinIdentity({ invitationCode: deviceInvitationCode });
        }
      }}
    >
      <RegistryContext.Provider value={registry}>
        <Main />
      </RegistryContext.Provider>
    </ClientProvider>
  );
};
