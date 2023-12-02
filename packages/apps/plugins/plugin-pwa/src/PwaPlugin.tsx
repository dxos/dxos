//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { type PluginDefinition } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { captureException } from '@dxos/sentry';

import { ServiceWorkerToast } from './components';
import meta from './meta';

export const PwaPlugin = (): PluginDefinition => ({
  meta,
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
