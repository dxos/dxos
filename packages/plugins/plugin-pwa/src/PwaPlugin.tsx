//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import { registerSW } from 'virtual:pwa-register';

import { Capability, Common, Plugin } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { captureException } from '@dxos/observability/sentry';

import { meta } from './meta';
import { translations } from './translations';

export const PwaPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'register-pwa',
    activatesOn: Common.ActivationEvent.OperationInvokerReady,
    activate: Effect.fnUntraced(function* () {
      // Get context for lazy capability access in callbacks.
      const context = yield* Capability.PluginContextService;

      const updateSW = registerSW({
        onNeedRefresh: () => {
          const { invokeSync } = context.getCapability(Common.Capability.OperationInvoker);
          invokeSync(Common.LayoutOperation.AddToast, {
            id: `${meta.id}/need-refresh`,
            title: ['need refresh label', { ns: meta.id }],
            description: ['need refresh description', { ns: meta.id }],
            duration: 4 * 60 * 1000, // 4m
            actionLabel: ['refresh label', { ns: meta.id }],
            actionAlt: ['refresh alt', { ns: meta.id }],
            onAction: () => updateSW(true),
          });
        },
        onOfflineReady: () => {
          const { invokeSync } = context.getCapability(Common.Capability.OperationInvoker);
          invokeSync(Common.LayoutOperation.AddToast, {
            id: `${meta.id}/offline-ready`,
            title: ['offline ready label', { ns: meta.id }],
            closeLabel: ['confirm label', { ns: meta.id }],
          });
        },
        onRegisterError: (err) => {
          captureException(err);
          log.error(err);
        },
      });
    }),
  }),
  Plugin.make,
);
