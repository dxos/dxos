//
// Copyright 2023 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Option from 'effect/Option';
import * as Predicate from 'effect/Predicate';
import * as Schedule from 'effect/Schedule';
import { registerSW } from 'virtual:pwa-register';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { AppCapabilities, AppCapability, LayoutOperation } from '@dxos/app-toolkit';
import { log } from '@dxos/log';

import { meta } from '#meta';
import { translations } from '#translations';

const UPDATE_CHECK_INTERVAL = Duration.hours(1);

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

const RegisterPwa = Capability.inlineModule(
  'RegisterPwa',
  { requires: [Capabilities.OperationInvoker], provides: [] },
  Effect.fnUntraced(function* () {
    const { invokePromise } = yield* Capabilities.OperationInvoker;

    let registration: ServiceWorkerRegistration | undefined;

    const updateSW = registerSW({
      onRegisteredSW: (_swUrl, swRegistration) => {
        registration = swRegistration;
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

    // The browser only re-fetches the worker script on navigation, but Composer sessions stay open
    // for days, so without polling a deployed update is never noticed and the refresh toast only
    // ever appears on reload. `Effect.repeat` runs the first check straight away, before
    // `onRegisteredSW` has fired — the optional call makes that opening tick a no-op.
    //
    // `update()` rejects in its own right — `InvalidStateError` while a worker is already
    // installing, a `TypeError` when the script fetch fails offline — so the rejection is recovered
    // rather than left to `Effect.promise`, whose defect would kill the daemon fiber and silently
    // end polling for the rest of the session.
    const checkForUpdate = Effect.tryPromise(async () => {
      await registration?.update();
    }).pipe(Effect.catchAll((error) => Effect.sync(() => log.warn('service worker update check failed', { error }))));

    const fiber = yield* checkForUpdate.pipe(Effect.repeat(Schedule.fixed(UPDATE_CHECK_INTERVAL)), Effect.forkDaemon);

    yield* Effect.addFinalizer(() => Fiber.interrupt(fiber));
    return [];
  }),
);

// Separate from `RegisterPwa` so that an app without the progress registry still registers the
// service worker — only the meter is lost, not the update flow itself.
const UpdateProgress = Capability.inlineModule(
  'UpdateProgress',
  { provides: [] },
  Effect.fnUntraced(function* () {
    // Optional, so that the comment above holds: requiring it would fail the whole plugin — and with
    // it the service-worker registration — on a host that omits plugin-progress.
    const registryOption = yield* Capability.getOption(AppCapabilities.ProgressRegistry);
    if (Option.isNone(registryOption)) {
      return [];
    }
    const registry = registryOption.value;

    let monitor: AppCapabilities.ProgressMonitor | undefined;
    const handleMessage = (event: MessageEvent) => {
      if (!isPrecacheProgress(event.data)) {
        return;
      }

      const { current, total, isUpdate, done } = event.data;
      if (done && !monitor) {
        // Completion for a download this window never saw start — nothing to report.
        return;
      }

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

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        navigator.serviceWorker?.removeEventListener('message', handleMessage);
        monitor?.remove();
      }),
    );
    return [];
  }),
);

export const PwaPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.addModule(RegisterPwa),
  Plugin.addModule(UpdateProgress),
  Plugin.make,
);

export default PwaPlugin;
