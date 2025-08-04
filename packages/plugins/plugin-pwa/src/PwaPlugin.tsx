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

import { PWA_PLUGIN, meta } from './meta';
import { translations } from './translations';

export const PwaPlugin = () =>
  definePlugin(meta, [
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
              createIntent(LayoutAction.AddToast, {
                part: 'toast',
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

        return contributes(Capabilities.Null, null);
      },
    }),
  ]);
