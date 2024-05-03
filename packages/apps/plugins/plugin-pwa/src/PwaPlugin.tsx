//
// Copyright 2023 DXOS.org
//

import { registerSW } from 'virtual:pwa-register';

import { parseIntentPlugin, resolvePlugin, type PluginDefinition, LayoutAction } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { captureException } from '@dxos/observability/sentry';

import meta, { PWA_PLUGIN } from './meta';
import translations from './translations';

export const PwaPlugin = (): PluginDefinition => ({
  meta,
  ready: async (plugins) => {
    const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;

    const updateSW = registerSW({
      onNeedRefresh: () =>
        dispatch?.({
          action: LayoutAction.SET_LAYOUT,
          data: {
            element: 'toast',
            subject: {
              id: `${PWA_PLUGIN}/need-refresh`,
              title: translations[0]['en-US'][PWA_PLUGIN]['need refresh label'],
              description: translations[0]['en-US'][PWA_PLUGIN]['need refresh description'],
              duration: 4 * 60 * 1000, // 4m
              actionLabel: translations[0]['en-US'][PWA_PLUGIN]['refresh label'],
              actionAlt: translations[0]['en-US'][PWA_PLUGIN]['refresh alt'],
              onAction: () => updateSW(true),
            },
          },
        }),
      onOfflineReady: () =>
        dispatch?.({
          action: LayoutAction.SET_LAYOUT,
          data: {
            element: 'toast',
            subject: {
              id: `${PWA_PLUGIN}/offline-ready`,
              title: translations[0]['en-US'][PWA_PLUGIN]['offline ready label'],
              closeLabel: translations[0]['en-US'][PWA_PLUGIN]['confirm label'],
            },
          },
        }),
      onRegisterError: (err) => {
        captureException(err);
        log.error(err);
      },
    });
  },
});
