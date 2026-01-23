//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { generatePath, useNavigate } from 'react-router-dom';

import { ClientProvider } from '@dxos/react-client';

import { getConfig } from '../config';
import { Todo, TodoList, createTodoList } from '../types';

import { Main } from './Main';

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
      types={[TodoList, Todo]}
      onInitialized={async (client) => {
        const searchProps = new URLSearchParams(location.search);
        const deviceInvitationCode = searchProps.get('deviceInvitationCode');
        if (!client.halo.identity.get() && !deviceInvitationCode) {
          await client.halo.createIdentity();
          await client.spaces.waitUntilReady();
          await client.spaces.default.waitUntilReady();
          createTodoList(client.spaces.default);
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
      <Main />
    </ClientProvider>
  );
};
