//
// Copyright 2020 DXOS.org
//

import React, { FC, ReactNode } from 'react';
// import { useRegisterSW } from 'virtual:pwa-register/react';

import { log } from '@dxos/log';
import { appkitTranslations, Fallback, ServiceWorkerToast } from '@dxos/react-appkit';
import { ThemeProvider } from '@dxos/react-components';

import { App } from './app';
import { AppState } from './hooks';
import kaiTranslations from './translations';

const useRegisterSW: (args: any) => any = () => {}; // TODO(burdon): Remove.

/**
 * Root component.
 */
export const Root: FC<{ initialState?: AppState; pwa?: boolean }> = ({ initialState = {}, pwa = false }) => {
  if (pwa) {
    return (
      <Base initialState={initialState}>
        <PWA />
      </Base>
    );
  } else {
    return <Base initialState={initialState} />;
  }
};

const Base: FC<{ initialState: AppState; children?: ReactNode }> = ({ initialState, children }) => {
  return (
    <ThemeProvider
      appNs='kai'
      resourceExtensions={[appkitTranslations, kaiTranslations]}
      fallback={<Fallback message='Loading...' />}
    >
      <App initialState={initialState} />

      {children}
    </ThemeProvider>
  );
};

/**
 * Progressive web app registration and notifications.
 * https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps
 */
const PWA = () => {
  const {
    offlineReady: [offlineReady, _setOfflineReady],
    needRefresh: [needRefresh, _setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisterError: (err: any) => {
      log.error(err);
    }
  });

  return needRefresh ? (
    <ServiceWorkerToast {...{ variant: 'needRefresh', updateServiceWorker }} />
  ) : offlineReady ? (
    <ServiceWorkerToast variant='offlineReady' />
  ) : null;
};
