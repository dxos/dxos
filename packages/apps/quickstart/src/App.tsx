//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { Config, Dynamics, Defaults } from '@dxos/config';
import { GenericFallback, ServiceWorkerToastContainer, appkitTranslations } from '@dxos/react-appkit';
import { ClientProvider } from '@dxos/react-client';
import { ThemeProvider } from '@dxos/react-components';

import { Welcome } from './Welcome';

import './index.css';

// Dynamics allows configuration to be supplied by the hosting KUBE
const config = async () => new Config(await Dynamics(), Defaults());

export const App = () => {
  const serviceWorker = useRegisterSW();
  return (
    <ThemeProvider appNs='quickstart' resourceExtensions={[appkitTranslations]} fallback={<GenericFallback />}>
      <ClientProvider config={config} fallback={GenericFallback}>
        <Welcome name='quickstart' />
        <ServiceWorkerToastContainer {...serviceWorker} />
      </ClientProvider>
    </ThemeProvider>
  );
};
