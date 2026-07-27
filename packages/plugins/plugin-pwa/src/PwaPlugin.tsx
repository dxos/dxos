//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';
import { registerSW } from 'virtual:pwa-register';

import { ActivationEvent, ActivationEvents, Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppCapabilities, AppPlugin, LayoutOperation } from '@dxos/app-toolkit';
import { log } from '@dxos/log';

import { meta } from '#meta';
import { translations } from '#translations';

const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000; // 1h

/**
 * Progress envelope posted by the host's service worker while it precaches a build. The contract is
 * duplicated in `composer-app/src/sw.ts` so the worker bundle stays free of host code — keep in sync.
 */
const PRECACHE_PROGRESS = 'dxos:precache-progress';

type PrecacheProgress = {
  type: typeof PRECACHE_PROGRESS;
  current: number;
  total: number;
  isUpdate: boolean;
  done: boolean;
};

const isPrecacheProgress = (data: unknown): data is PrecacheProgress =>
  Predicate.isRecord(data) && data.type === PRECACHE_PROGRESS;

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
  // Separate from `register-pwa` so that an app without the progress registry still registers the
  // service worker — only the meter is lost, not the update flow itself.
  Plugin.addModule({
    id: 'update-progress',
    activatesOn: ActivationEvent.allOf(ActivationEvents.ProcessManagerReady, AppActivationEvents.ProgressRegistryReady),
    activate: Effect.fnUntraced(function* () {
      const registry = yield* Capability.get(AppCapabilities.ProgressRegistry);

      let monitor: AppCapabilities.ProgressMonitor | undefined;
      const handleMessage = (event: MessageEvent) => {
        if (!isPrecacheProgress(event.data)) {
          return;
        }

        const { current, total, isUpdate, done } = event.data;
        monitor ??= registry.register(`${meta.profile.key}.precache`, {
          label: isUpdate ? 'Downloading app update' : 'Preparing offline use',
          total,
        });
        monitor.total(total);
        monitor.set(current);
        if (done) {
          monitor.done();
          // Transient monitor: the download is a one-shot, so drop it rather than leave a completed
          // row in the registry until the next reload.
          monitor.remove();
          monitor = undefined;
        }
      };

      navigator.serviceWorker?.addEventListener('message', handleMessage);

      return Capability.contributes(Capabilities.Null, null, () =>
        Effect.sync(() => {
          navigator.serviceWorker?.removeEventListener('message', handleMessage);
          monitor?.remove();
        }),
      );
    }),
  }),
  Plugin.make,
);

export default PwaPlugin;
