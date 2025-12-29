//
// Copyright 2023 DXOS.org
//

import { registerSW } from 'virtual:pwa-register';

import { Capability, Common, Plugin, createIntent } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { captureException } from '@dxos/observability/sentry';

import { meta } from './meta';
import { translations } from './translations';

export const PwaPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'translations',
    activatesOn: Common.ActivationEvent.SetupTranslations,
    activate: () => Capability.contributes(Common.Capability.Translations, translations),
  }),
  Plugin.addModule({
    id: 'register-pwa',
    activatesOn: Common.ActivationEvent.DispatcherReady,
    activate: (context: Capability.PluginContext) => {
      const { dispatchPromise: dispatch } = context.getCapability(Common.Capability.IntentDispatcher);

      const updateSW = registerSW({
        onNeedRefresh: () =>
          dispatch?.(
            createIntent(Common.LayoutAction.AddToast, {
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
            createIntent(Common.LayoutAction.AddToast, {
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

      return Capability.contributes(Common.Capability.Null, null);
    },
  }),
  Plugin.make,
);
