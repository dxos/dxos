//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';
import { useRegisterSW } from 'virtual:pwa-register/react';

import '@dxosTheme';
import { log } from '@dxos/log';
import { ServiceWorkerToast } from '@dxos/react-appkit';

import { App } from './app';
import { AppState } from './hooks';

import '../style.css';

const bool = (str?: string): boolean => (str ? /(true|1)/i.test(str) : false);

const initialState: AppState = {
  dev: bool(import.meta.env.VITE_DEV),
  debug: bool(import.meta.env.VITE_DEBUG),
  pwa: bool(import.meta.env.VITE_PWA)
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

createRoot(document.getElementById('root')!).render(
  // prettier-ignore
  <App initialState={initialState}>
    {initialState.pwa && <PWA />}
  </App>
);
