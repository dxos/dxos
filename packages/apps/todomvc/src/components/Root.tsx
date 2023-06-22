//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { fromIFrame, fromHost } from '@dxos/client';
import { Config, Defaults, Dynamics, Envs, Local } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';

import { Main } from './Main';

const configProvider = async () => new Config(await Dynamics(), await Envs(), Local(), Defaults());
const servicesProvider = (config?: Config) =>
  config?.get('runtime.app.env.DX_VAULT') === 'false' ? fromHost(config) : fromIFrame(config);

export const Root = () => (
  <ClientProvider config={configProvider} services={servicesProvider}>
    <Main />
  </ClientProvider>
);
