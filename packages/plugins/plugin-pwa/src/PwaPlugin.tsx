//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import { registerSW } from 'virtual:pwa-register';

import { Capabilities, Plugin } from '@dxos/app-framework';
import { AppPlugin, LayoutOperation } from '@dxos/app-toolkit';
import { log } from '@dxos/log';

import { meta } from '#meta';
import { translations } from '#translations';

export const PwaPlugin = Plugin.define(meta).pipe(
  AppPlugin.addTranslationsModule<void>({ translations }),
  Plugin.addModule({
    id: 'register-pwa',
    requires: [Capabilities.OperationInvoker],
    provides: [],
    activate: Effect.fnUntraced(function* () {
      const { invokePromise } = yield* Capabilities.OperationInvoker;

      const updateSW = registerSW({
        onNeedRefresh: () => {
          void invokePromise(LayoutOperation.AddToast, {
            id: `${meta.profile.key}.need-refresh`,
            title: ['need-refresh.label', { ns: meta.profile.key }],
            description: ['need-refresh.description', { ns: meta.profile.key }],
            duration: 4 * 60 * 1000, // 4m
            actionLabel: ['refresh.label', { ns: meta.profile.key }],
            actionAlt: ['refresh.alt', { ns: meta.profile.key }],
            onAction: () => updateSW(true),
          });
        },
        onOfflineReady: () => {
          void invokePromise(LayoutOperation.AddToast, {
            id: `${meta.profile.key}.offline-ready`,
            title: ['offline-ready.label', { ns: meta.profile.key }],
            closeLabel: ['confirm.label', { ns: meta.profile.key }],
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

export default PwaPlugin;
