//
// Copyright 2023 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Option from 'effect/Option';
import * as Predicate from 'effect/Predicate';
import * as Schedule from 'effect/Schedule';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { registerSW } from 'virtual:pwa-register';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppUpdate from '@dxos/app-toolkit/AppUpdate';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { log } from '@dxos/log';

import { meta } from '#meta';
import { translations } from '#translations';

import { makeUpdateManager, progressStatus } from './update-manager.ts';

// Every 15 minutes rather than hourly. A check is one conditional request for the worker script, and
// finding an update sooner costs nothing extra: the install happens once per deployed version either
// way. An hour was long enough to leave a tab a full release behind.
const UPDATE_CHECK_INTERVAL = Duration.minutes(15);

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
  Predicate.isObject(data) && data.type === PRECACHE_PROGRESS;

export const RegisterPwa = Capability.inlineModule(
  'RegisterPwa',
  { requires: [Capabilities.OperationInvoker, Capabilities.AtomRegistry], provides: [AppCapabilities.UpdateManager] },
  Effect.fnUntraced(function* () {
    const { invokePromise } = yield* Capabilities.OperationInvoker;
    const atomRegistry = yield* Capabilities.AtomRegistry;

    // No service workers at all on an insecure origin and in some embedded webviews. Under the vite dev
    // server the plugin still loads, but `virtual:pwa-register` is a stub that never registers.
    const supported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
    const dev = import.meta.env.DEV;
    const statusAtom = Atom.make<AppUpdate.Status>(
      !supported ? { kind: 'unsupported' } : dev ? { kind: 'dev' } : { kind: 'idle' },
    ).pipe(Atom.keepAlive);
    const setStatus = (status: AppUpdate.Status) => atomRegistry.set(statusAtom, status);

    let registration: ServiceWorkerRegistration | undefined;
    let resolveRegistration!: (registration: ServiceWorkerRegistration | undefined) => void;
    const whenRegistered = new Promise<ServiceWorkerRegistration | undefined>((resolve) => {
      resolveRegistration = resolve;
    });

    const updateSW = registerSW({
      onRegisteredSW: (_swUrl, swRegistration) => {
        registration = swRegistration;
        resolveRegistration(swRegistration);
      },
      onNeedRefresh: () => {
        // The worker is installed and waiting, so the download is already done — this is `ready`, not
        // `available`. See AppUpdate.Manager on why the web has no `install` step.
        setStatus({ kind: 'ready' });
        void invokePromise(LayoutOperation.AddToast, {
          id: `${meta.profile.key}.need-refresh`,
          title: ['need-refresh.label', { ns: meta.profile.key }],
          description: ['need-refresh.description', { ns: meta.profile.key }],
          // Persists until acted on. It used to expire after 4 minutes, which left a user who missed
          // it with no way back to the update; the settings row is that way back now, and a toast
          // that outlives the glance costs nothing next to a client running a stale build for days.
          duration: Infinity,
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
        setStatus({ kind: 'failed', error: err instanceof Error ? err.message : String(err) });
        resolveRegistration(undefined);
      },
    });

    // Precache progress doubles as the download meter for an update in flight. Read here as well as in
    // `UpdateProgress` because the two surfaces are independent: the progress registry is optional, and
    // the settings row must still show a percentage on a host that omits it.
    const handleProgress = (event: MessageEvent) => {
      if (!isPrecacheProgress(event.data) || !event.data.isUpdate) {
        return;
      }
      // Not left to `onNeedRefresh`: workbox stops observing after the first update found by polling.
      setStatus(progressStatus(event.data));
    };
    navigator.serviceWorker?.addEventListener('message', handleProgress);
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => navigator.serviceWorker?.removeEventListener('message', handleProgress)),
    );

    const manager = makeUpdateManager({
      status: statusAtom,
      setStatus,
      supported,
      dev,
      registration: whenRegistered,
      container: navigator.serviceWorker,
      skipWaiting: () => updateSW(true),
      reload: () => window.location.reload(),
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
    }).pipe(Effect.catch((error) => Effect.sync(() => log.warn('service worker update check failed', { error }))));

    const fiber = yield* checkForUpdate.pipe(Effect.repeat(Schedule.fixed(UPDATE_CHECK_INTERVAL)), Effect.forkDetach);

    yield* Effect.addFinalizer(() => Fiber.interrupt(fiber));

    return Capability.contribute(AppCapabilities.UpdateManager, manager);
  }),
);

// Separate from `RegisterPwa` so that an app without the progress registry still registers the
// service worker — only the meter is lost, not the update flow itself.
export const UpdateProgress = Capability.inlineModule(
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

export const PwaSettings = AppCapability.settings(() => import('./settings.ts'), {
  activatesOn: ActivationEvents.Idle,
});

export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: ['org.dxos.role.article'],
});

export const Translations = AppCapability.translations(translations);
