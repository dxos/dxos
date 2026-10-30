//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Atom from 'effect/reactivity/Atom';
import * as Schedule from 'effect/Schedule';
import { registerSW } from 'virtual:pwa-register';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import type * as AppUpdate from '@dxos/app-toolkit/AppUpdate';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { log } from '@dxos/log';

import { PwaNamespace } from '../namespace.ts';
import { UPDATE_CHECK_INTERVAL, isPrecacheProgress } from '../precache.ts';
import { type PwaOptions } from '../settings-store.ts';
import { makeUpdateManager, progressStatus } from './update-manager.ts';
import { entryScript, makeVersionCheckManager } from './version-check.ts';

const RELOADED_FOR_KEY = `${PwaNamespace.key}.reloaded-for`;

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ serviceWorker = true }: PwaOptions) {
    const { invokePromise } = yield* Capabilities.OperationInvoker;
    const atomRegistry = yield* Capabilities.AtomRegistry;

    // No `registerSW`: in this build it registers the self-destroying worker, meant only for old installs.
    if (!serviceWorker) {
      const statusAtom = Atom.make<AppUpdate.Status>({ kind: 'idle' }).pipe(Atom.keepAlive);
      return Capability.contribute(
        AppCapabilities.UpdateManager,
        makeVersionCheckManager({
          status: statusAtom,
          setStatus: (status) => atomRegistry.set(statusAtom, status),
          dev: import.meta.env.DEV,
          current: entryScript(document),
          fetchLatest: async () => {
            const response = await fetch(import.meta.env.BASE_URL, { cache: 'no-store' });
            if (!response.ok) {
              throw new Error(`index fetch failed: ${response.status}`);
            }
            return entryScript(new DOMParser().parseFromString(await response.text(), 'text/html'));
          },
          reloadedFor: {
            get: () => sessionStorage.getItem(RELOADED_FOR_KEY) ?? undefined,
            set: (build) => sessionStorage.setItem(RELOADED_FOR_KEY, build),
          },
          reload: () => window.location.reload(),
        }),
      );
    }

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
          id: `${PwaNamespace.key}.need-refresh`,
          title: ['need-refresh.label', { ns: PwaNamespace.key }],
          description: ['need-refresh.description', { ns: PwaNamespace.key }],
          // Persists until acted on. It used to expire after 4 minutes, which left a user who missed
          // it with no way back to the update; the settings row is that way back now, and a toast
          // that outlives the glance costs nothing next to a client running a stale build for days.
          duration: Infinity,
          actionLabel: ['refresh.label', { ns: PwaNamespace.key }],
          actionAlt: ['refresh.alt', { ns: PwaNamespace.key }],
          onAction: () => updateSW(true),
        });
      },
      onOfflineReady: () => {
        void invokePromise(LayoutOperation.AddToast, {
          id: `${PwaNamespace.key}.offline-ready`,
          title: ['offline-ready.label', { ns: PwaNamespace.key }],
          closeLabel: ['confirm.label', { ns: PwaNamespace.key }],
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
