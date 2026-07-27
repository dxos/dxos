//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import { registerSW } from 'virtual:pwa-register';

import { ActivationEvents, Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin, LayoutOperation } from '@dxos/app-toolkit';
import { log } from '@dxos/log';

import { meta } from '#meta';
import { translations } from '#translations';

const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000; // 1h

export const PwaPlugin = Plugin.define(meta).pipe(
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'register-pwa',
    activatesOn: ActivationEvents.ProcessManagerReady,
    activate: Effect.fnUntraced(function* () {
      const { invokePromise } = yield* Capability.get(Capabilities.OperationInvoker);

      let timer: ReturnType<typeof setInterval> | undefined;

      const updateSW = registerSW({
        onRegisteredSW: (_swUrl, registration) => {
          if (!registration) {
            return;
          }
          // The browser only re-fetches the worker script on navigation, but Composer sessions stay
          // open for days, so without polling a deployed update is never noticed and the refresh
          // toast only ever appears on reload.
          timer = setInterval(() => void registration.update(), UPDATE_CHECK_INTERVAL);
        },
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

      return Capability.contributes(Capabilities.Null, null, () => Effect.sync(() => clearInterval(timer)));
    }),
  }),
  Plugin.make,
);

export default PwaPlugin;
