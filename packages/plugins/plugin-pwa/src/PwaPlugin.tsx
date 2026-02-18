//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import { registerSW } from 'virtual:pwa-register';

import { ActivationEvents, Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin, LayoutOperation } from '@dxos/app-toolkit';
import { log } from '@dxos/log';

import { meta } from './meta';
import { translations } from './translations';

export const PwaPlugin = Plugin.define(meta).pipe(
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'register-pwa',
    activatesOn: ActivationEvents.OperationInvokerReady,
    activate: Effect.fnUntraced(function* () {
      const { invokeSync } = yield* Capability.get(Capabilities.OperationInvoker);

      const updateSW = registerSW({
        onNeedRefresh: () => {
          invokeSync(LayoutOperation.AddToast, {
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
          invokeSync(LayoutOperation.AddToast, {
            id: `${meta.id}/offline-ready`,
            title: ['offline ready label', { ns: meta.id }],
            closeLabel: ['confirm label', { ns: meta.id }],
          });
        },
        onRegisterError: (err) => {
          log.error(err);
        },
      });
    }),
  }),
  Plugin.make,
);
