//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { log } from '@dxos/log';
import { appkitTranslations, Fallback, ServiceWorkerToast } from '@dxos/react-appkit';
import { ThemeProvider } from '@dxos/react-components';

import { App } from './app';
import { AppView } from './hooks';
import kaiTranslations from './translations';

// TODO(burdon): Modes from env.
const getView = (all = false) =>
  all
    ? [
        AppView.CALENDAR,
        AppView.DASHBOARD,
        AppView.META,
        AppView.KANBAN,
        AppView.TASKS,
        AppView.ORGS,
        AppView.GRAPH,
        AppView.EDITOR,
        AppView.MAP,
        AppView.GAME
      ]
    : [AppView.TASKS];

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
      <App debug={process.env.DEBUG === 'true'} views={getView(true)} />
      {needRefresh ? (
        <ServiceWorkerToast {...{ variant: 'needRefresh', updateServiceWorker }} />
      ) : offlineReady ? (
        <ServiceWorkerToast variant='offlineReady' />
      ) : null}
    </ThemeProvider>
  );
};
