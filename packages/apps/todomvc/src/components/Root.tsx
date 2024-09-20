//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { generatePath, useNavigate } from 'react-router-dom';

import { ClientProvider } from '@dxos/react-client';

import { Main } from './Main';
import { getConfig } from '../config';
import { createTodoList, TodoListType, TodoType } from '../types';

const createWorker = () =>
  new SharedWorker(new URL('../shared-worker', import.meta.url), {
    type: 'module',
    name: 'dxos-client-worker',
  });

export const Root = () => {
  const navigate = useNavigate();
  return (
    <ClientProvider
      config={getConfig}
      createWorker={createWorker}
      shell='./shell.html'
      onInitialized={async (client) => {
        client.addTypes([TodoListType, TodoType]);

        const searchParams = new URLSearchParams(location.search);
        const deviceInvitationCode = searchParams.get('deviceInvitationCode');
        if (!client.halo.identity.get() && !deviceInvitationCode) {
          await client.halo.createIdentity();
          await client.spaces.isReady.wait();
          await client.spaces.default.waitUntilReady();
          createTodoList(client.spaces.default);
        }

        const spaceInvitationCode = searchParams.get('spaceInvitationCode');
        if (spaceInvitationCode) {
          void client.shell.joinSpace({ invitationCode: spaceInvitationCode }).then(({ space }) => {
            space && navigate(generatePath('/:spaceKey', { spaceKey: space.key.toHex() }));
          });
        } else if (deviceInvitationCode) {
          void client.shell.joinIdentity({ invitationCode: deviceInvitationCode });
        }
      }}
    >
      <Main />
    </ClientProvider>
  );
};
