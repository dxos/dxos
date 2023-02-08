//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { HashRouter } from 'react-router-dom';

import { Config, Dynamics, Defaults } from '@dxos/config';
import { GenericFallback, appkitTranslations } from '@dxos/react-appkit';
import { ClientProvider } from '@dxos/react-client';
import { ThemeProvider } from '@dxos/react-components';

import { Routes } from './Routes';
import { Main } from './components/Main';

// Dynamics allows configuration to be supplied by the hosting KUBE
const config = async () => new Config(await Dynamics(), Defaults());

export const App = () => {
  return (
    <ThemeProvider appNs='tasks-app-2' resourceExtensions={[appkitTranslations]} fallback={<GenericFallback />}>
      <Main>
        <ClientProvider config={config} fallback={GenericFallback}>
          <HashRouter>
            <Routes />
          </HashRouter>
        </ClientProvider>
      </Main>
    </ThemeProvider>
  );
};
