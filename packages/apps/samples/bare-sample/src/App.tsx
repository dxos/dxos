//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { Config, Dynamics, Defaults } from '@dxos/config';
import { GenericFallback, ServiceWorkerToastContainer, translations } from '@dxos/react-appkit';
import { ClientProvider } from '@dxos/react-client';
import { UiKitProvider } from '@dxos/react-uikit';

// this includes css styles from @dxos/react-ui
import '@dxosTheme';

// Dynamics allows configuration to be supplied by the hosting KUBE
const config = async () => new Config(await Dynamics(), Defaults());

export const App = () => {
  const serviceWorker = useRegisterSW();
  return (
    <UiKitProvider appNs='@dxos/bare-sample' resourceExtensions={[translations]} fallback={<GenericFallback />}>
      <ClientProvider config={config} fallback={<GenericFallback />}>
        <div>Your code goes here</div>
        <ServiceWorkerToastContainer {...serviceWorker} />
      </ClientProvider>
    </UiKitProvider>
  );
};
