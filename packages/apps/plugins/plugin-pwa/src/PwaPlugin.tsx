//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { log } from '@dxos/log';
import { type PluginDefinition } from '@dxos/app-framework';
import { captureException } from '@dxos/sentry';

import { ServiceWorkerToast } from './components';

export const PwaPlugin = (): PluginDefinition => ({
  meta: {
    id: 'dxos.org/plugin/pwa',
  },
  provides: {
    context: ({ children }) => {
      const {
        offlineReady: [offlineReady, _setOfflineReady],
        needRefresh: [needRefresh, _setNeedRefresh],
        updateServiceWorker,
      } = useRegisterSW({
        onRegisterError: (err) => {
          captureException(err);
          log.error(err);
        },
      });

      return (
        <>
          {children}
          {needRefresh ? (
            <ServiceWorkerToast {...{ variant: 'needRefresh', updateServiceWorker }} />
          ) : offlineReady ? (
            <ServiceWorkerToast variant='offlineReady' />
          ) : null}
        </>
      );
    },
  },
});
