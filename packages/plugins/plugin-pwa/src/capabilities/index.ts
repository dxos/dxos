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

    // `serviceWorker` is absent on an insecure origin and in some embedded webviews. Everything else
    // that leaves this build without an update channel — a dev server, a `DX_PWA=false` build whose
    // worker self-destructs — is indistinguishable from here at startup, so it is reported from
    // `check` instead, off whether a registration ever arrived. One truthful signal beats a build-time
    // guess that a `selfDestroying` production build would get wrong.
    const supported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
    const statusAtom = Atom.make<AppUpdate.Status>(supported ? { kind: 'idle' } : { kind: 'unsupported' }).pipe(
      Atom.keepAlive,
    );
    const setStatus = (status: AppUpdate.Status) => atomRegistry.set(statusAtom, status);

    let registration: ServiceWorkerRegistration | undefined;

    const updateSW = registerSW({
      onRegisteredSW: (_swUrl, swRegistration) => {
        registration = swRegistration;
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
      },
    });

    // Precache progress doubles as the download meter for an update in flight. Read here as well as in
    // `UpdateProgress` because the two surfaces are independent: the progress registry is optional, and
    // the settings row must still show a percentage on a host that omits it.
    const handleProgress = (event: MessageEvent) => {
      if (!isPrecacheProgress(event.data) || !event.data.isUpdate) {
        return;
      }
      const { current, total, done } = event.data;
      // `ready` is owned by `onNeedRefresh`, which fires once the worker is actually waiting.
      if (!done) {
        setStatus({ kind: 'downloading', progress: { completed: current, total, unit: 'entries' } });
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleProgress);
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => navigator.serviceWorker?.removeEventListener('message', handleProgress)),
    );

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

    /**
     * `check` is the whole download on the web: `update()` fetches the worker script and, if it
     * differs, the browser installs it — precaching every entry — before anything is observable. So
     * this resolves when the check is done, not when the update is; progress and completion arrive on
     * the message and `onNeedRefresh` handlers above.
     */
    const manager: AppUpdate.Manager = {
      status: statusAtom,
      check: async () => {
        // No registration means the worker never took: a dev server, or a build whose worker
        // self-destructs. Indistinguishable from unsupported as far as updating goes.
        if (!supported || !registration) {
          setStatus({ kind: 'unsupported' });
          return;
        }
        // A worker already waiting means an update is staged and `ready` still holds; re-checking
        // would report `up-to-date` over it.
        if (registration.waiting) {
          setStatus({ kind: 'ready' });
          return;
        }
        setStatus({ kind: 'checking' });
        try {
          await registration.update();
        } catch (error) {
          // `update()` rejects in its own right: InvalidStateError while one is already installing, a
          // TypeError when the script fetch fails offline.
          setStatus({ kind: 'failed', error: error instanceof Error ? error.message : String(error) });
          return;
        }
        // `installing` means the browser took the bait and is precaching; the message handler owns the
        // status from here. Otherwise the script was byte-identical and there is nothing to install.
        if (!registration.installing && !registration.waiting) {
          setStatus({ kind: 'up-to-date', checkedAt: Date.now() });
        }
      },
      // No `install`: see above and AppUpdate.Manager.
      apply: async () => {
        if (!supported) {
          return;
        }
        // Sends SKIP_WAITING and reloads every tab on `controllerchange`.
        await updateSW(true);
      },
    };

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

export const ReactSurface = Capability.lazyModule(
  'ReactSurface',
  { provides: [Capabilities.ReactSurface] },
  () => import('./react-surface.ts'),
);

export const Translations = AppCapability.translations(translations);
