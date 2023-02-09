//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';

import '@dxosTheme';
import { log } from '@dxos/log';
import { ServiceWorkerToast } from '@dxos/react-appkit';
import { captureException } from '@dxos/sentry';

import { createRouter } from './app';
import { AppState } from './hooks';

import '../style.css';

const bool = (str?: string): boolean => (str ? /(true|1)/i.test(str) : false);

// TODO(wittjosiah): Migrate to ES Modules.
/* eslint-disable @typescript-eslint/ban-ts-comment */
const initialState: AppState = {
  // @ts-ignore
  dev: bool(import.meta.env.VITE_DEV),
  // @ts-ignore
  debug: bool(import.meta.env.VITE_DEBUG),
  // @ts-ignore
  pwa: bool(import.meta.env.VITE_PWA)
};
/* eslint-enable @typescript-eslint/ban-ts-comment */

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
      captureException(err);
      log.error(err);
    }
  });

  return needRefresh ? (
    <ServiceWorkerToast {...{ variant: 'needRefresh', updateServiceWorker }} />
  ) : offlineReady ? (
    <ServiceWorkerToast variant='offlineReady' />
  ) : null;
};

const router = createRouter(initialState, initialState ? <PWA /> : undefined);
const root = createRoot(document.getElementById('root')!);
root.render(<RouterProvider router={router} />);
