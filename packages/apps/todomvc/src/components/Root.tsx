//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { generatePath, useNavigate } from 'react-router-dom';

import { Config, Defaults, Dynamics, Envs, Local, fromIFrame, fromHost, ClientProvider } from '@dxos/react-client';

import { Main } from './Main';
import { types } from '../proto';

const configProvider = async () => new Config(await Dynamics(), await Envs(), Local(), Defaults());
const servicesProvider = (config?: Config) =>
  config?.get('runtime.app.env.DX_VAULT') === 'false' ? fromHost(config) : fromIFrame(config);

export const Root = () => {
  const navigate = useNavigate();
  return (
    <ClientProvider
      config={configProvider}
      services={servicesProvider}
      onInitialized={async (client) => {
        client.addSchema(types);

        const searchParams = new URLSearchParams(location.search);
        const deviceInvitationCode = searchParams.get('deviceInvitationCode');
        if (!client.halo.identity.get() && !deviceInvitationCode) {
          await client.halo.createIdentity();
        }

        const spaceInvitationCode = searchParams.get('spaceInvitationCode');
        if (spaceInvitationCode) {
          void client.shell.joinSpace({ invitationCode: spaceInvitationCode }).then(({ space }) => {
            space && navigate(generatePath('/:spaceKey', { spaceKey: space.key.toHex() }));
          });
        } else if (deviceInvitationCode) {
          void client.shell.initializeIdentity({ invitationCode: deviceInvitationCode });
        }
      }}
    >
      <Main />
    </ClientProvider>
  );
};
