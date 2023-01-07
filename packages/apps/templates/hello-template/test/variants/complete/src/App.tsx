//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { Config, Dynamics, Defaults } from '@dxos/config';
import { GenericFallback, ServiceWorkerToastContainer, translations } from '@dxos/react-appkit';
import { ClientProvider } from '@dxos/react-client';
import { UiKitProvider } from '@dxos/react-uikit';

import { Welcome } from './Welcome';

import './index.scss';

// this includes css styles from @dxos/react-ui
import '@dxosTheme';

// Dynamics allows configuration to be supplied by the hosting KUBE
const config = async () => new Config(await Dynamics(), Defaults());

export const App = () => {
  const serviceWorker = useRegisterSW();
  return (
    <UiKitProvider
      appNs='@dxos/hello-template-complete'
      resourceExtensions={[translations]}
      fallback={<GenericFallback />}
    >
      <ClientProvider config={config} fallback={<GenericFallback />}>
        <Welcome name='@dxos/hello-template-complete' />
        <ServiceWorkerToastContainer {...serviceWorker} />
      </ClientProvider>
    </UiKitProvider>
  );
};
