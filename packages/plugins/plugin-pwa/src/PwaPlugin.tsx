//
// Copyright 2023 DXOS.org
//

import { registerSW } from 'virtual:pwa-register';

import {
  parseIntentPlugin,
  resolvePlugin,
  type PluginDefinition,
  LayoutAction,
  createIntent,
} from '@dxos/app-framework';
import { log } from '@dxos/log';
import { captureException } from '@dxos/observability/sentry';

import meta, { PWA_PLUGIN } from './meta';

export const PwaPlugin = (): PluginDefinition => ({
  meta,
  ready: async ({ plugins }) => {
    const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatchPromise;

    const updateSW = registerSW({
      onNeedRefresh: () =>
        dispatch?.(
          createIntent(LayoutAction.SetLayout, {
            element: 'toast',
            subject: {
              id: `${PWA_PLUGIN}/need-refresh`,
              title: ['need refresh label', { ns: PWA_PLUGIN }],
              description: ['need refresh description', { ns: PWA_PLUGIN }],
              duration: 4 * 60 * 1000, // 4m
              actionLabel: ['refresh label', { ns: PWA_PLUGIN }],
              actionAlt: ['refresh alt', { ns: PWA_PLUGIN }],
              onAction: () => updateSW(true),
            },
          }),
        ),
      onOfflineReady: () =>
        dispatch?.(
          createIntent(LayoutAction.SetLayout, {
            element: 'toast',
            subject: {
              id: `${PWA_PLUGIN}/offline-ready`,
              title: ['offline ready label', { ns: PWA_PLUGIN }],
              closeLabel: ['confirm label', { ns: PWA_PLUGIN }],
            },
          }),
        ),
      onRegisterError: (err) => {
        captureException(err);
        log.error(err);
      },
    });
  },
});
