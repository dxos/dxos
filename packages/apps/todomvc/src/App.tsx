//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';

import { fromHost, fromIFrame } from '@dxos/client';
import { Config, Defaults, Dynamics, Envs } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';

import { Main, Layout, Navigator } from './components';

const configProvider = async () => new Config(await Dynamics(), await Envs(), Defaults());
const servicesProvider = (config?: Config) =>
  config?.get('runtime.app.env.DX_VAULT') === 'false' ? fromHost(config) : fromIFrame(config);

export const App = () => (
  <ClientProvider config={configProvider} services={servicesProvider}>
    <HashRouter>
      <Navigator />
      <Routes>
        <Route path='/' element={<Layout />}>
          <Route path='/:space' element={<Main />} />
          <Route path='/:space/:state' element={<Main />} />
        </Route>
      </Routes>
    </HashRouter>
  </ClientProvider>
);
