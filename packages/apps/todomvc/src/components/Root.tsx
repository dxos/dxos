//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Config, Defaults, Dynamics, Envs, Local, fromIFrame, fromHost, ClientProvider } from '@dxos/react-client';

import { Main } from './Main';

const configProvider = async () => new Config(await Dynamics(), await Envs(), Local(), Defaults());
const servicesProvider = (config?: Config) =>
  config?.get('runtime.app.env.DX_VAULT') === 'false' ? fromHost(config) : fromIFrame(config);

export const Root = () => (
  <ClientProvider
    config={configProvider}
    services={servicesProvider}
    onInitialized={async (client) => {
      const searchParams = new URLSearchParams(location.search);
      if (!client.halo.identity.get() && !searchParams.has('deviceInvitationCode')) {
        await client.halo.createIdentity();
      }
    }}
  >
    <Main />
  </ClientProvider>
);
