//
// Copyright 2023 DXOS.org
//

import { registerSW } from 'virtual:pwa-register';

import {
  Capabilities,
  Events,
  LayoutAction,
  contributes,
  createIntent,
  defineModule,
  definePlugin,
} from '@dxos/app-framework';
import { log } from '@dxos/log';
import { captureException } from '@dxos/observability/sentry';

import { meta } from './meta';
import { translations } from './translations';

export const PwaPlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/translations`,
    activatesOn: Events.SetupTranslations,
    activate: () => contributes(Capabilities.Translations, translations),
  }),
  defineModule({
    id: `${meta.id}/module/register-pwa`,
    activatesOn: Events.DispatcherReady,
    activate: (context) => {
      const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);

      const updateSW = registerSW({
        onNeedRefresh: () =>
          dispatch?.(
            createIntent(LayoutAction.AddToast, {
              part: 'toast',
              subject: {
                id: `${meta.id}/need-refresh`,
                title: ['need refresh label', { ns: meta.id }],
                description: ['need refresh description', { ns: meta.id }],
                duration: 4 * 60 * 1000, // 4m
                actionLabel: ['refresh label', { ns: meta.id }],
                actionAlt: ['refresh alt', { ns: meta.id }],
                onAction: () => updateSW(true),
              },
            }),
          ),
        onOfflineReady: () =>
          dispatch?.(
            createIntent(LayoutAction.AddToast, {
              part: 'toast',
              subject: {
                id: `${meta.id}/offline-ready`,
                title: ['offline ready label', { ns: meta.id }],
                closeLabel: ['confirm label', { ns: meta.id }],
              },
            }),
          ),
        onRegisterError: (err) => {
          captureException(err);
          log.error(err);
        },
      });

      return contributes(Capabilities.Null, null);
    },
  }),
]);
