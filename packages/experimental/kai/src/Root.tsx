//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { log } from '@dxos/log';
import { appkitTranslations, Fallback, ServiceWorkerToast } from '@dxos/react-appkit';
import { ThemeProvider } from '@dxos/react-components';

import { App, views } from './app';
import kaiTranslations from './translations';

// TODO(burdon): Get debug from config.
export const Root = () => {
  const {
    offlineReady: [offlineReady, _setOfflineReady],
    needRefresh: [needRefresh, _setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisterError: (err) => {
      log.error(err);
    }
  });

  // TODO(burdon): Modes from env/config.
  // const demo = process.env.DEMO === 'true';

  return (
    <ThemeProvider
      appNs='kai'
      resourceExtensions={[appkitTranslations, kaiTranslations]}
      fallback={<Fallback message='Loading...' />}
    >
      <App debug={process.env.DEBUG === 'true'} views={views} />
      {needRefresh ? (
        <ServiceWorkerToast {...{ variant: 'needRefresh', updateServiceWorker }} />
      ) : offlineReady ? (
        <ServiceWorkerToast variant='offlineReady' />
      ) : null}
    </ThemeProvider>
  );
};
