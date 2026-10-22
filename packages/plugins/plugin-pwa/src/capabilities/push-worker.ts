//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

import { type PushManagerLike } from './push-provider.ts';

type WorkerLike = {
  readonly state: string;
  addEventListener: (type: 'statechange', listener: () => void) => void;
};

/** The parts of a `ServiceWorkerRegistration` push uses, so registration can be driven without a browser. */
export type PushWorkerRegistrationLike = {
  readonly scope: string;
  readonly active: object | null;
  readonly installing: WorkerLike | null;
  readonly waiting: WorkerLike | null;
  readonly pushManager: PushManagerLike;
};

/** The parts of `navigator.serviceWorker` push worker registration uses. */
export type ServiceWorkerContainerLike = {
  register: (scriptUrl: string, options: { scope: string; type: 'module' }) => Promise<PushWorkerRegistrationLike>;
  getRegistration: (clientUrl: string) => Promise<PushWorkerRegistrationLike | undefined>;
};

/** Resolves once the registration has an active worker; never, if its install fails (the provider times out). */
const whenActive = (registration: PushWorkerRegistrationLike): Promise<void> => {
  if (registration.active) {
    return Promise.resolve();
  }
  const worker = registration.installing ?? registration.waiting;
  return new Promise((resolve) => {
    worker?.addEventListener('statechange', () => {
      if (worker.state === 'activated') {
        resolve();
      }
    });
  });
};

/**
 * Pushes used to go to the offline worker. Its subscription is dropped so EDGE forgets that endpoint at its next push,
 * instead of the browser showing a generic notification for a worker that no longer handles push.
 */
const dropLegacySubscription = async (
  container: ServiceWorkerContainerLike,
  registration: PushWorkerRegistrationLike,
): Promise<void> => {
  const legacy = await container.getRegistration('/');
  if (legacy && legacy.scope !== registration.scope) {
    await (await legacy.pushManager.getSubscription())?.unsubscribe();
  }
};

/**
 * Registers the host's push-only worker at the scope of its own directory, which controls no page, and resolves once
 * it is active; undefined when the browser refuses it.
 */
export const registerPushWorker = async (
  container: ServiceWorkerContainerLike,
  scriptUrl: string,
  base: string = globalThis.location.href,
): Promise<PushWorkerRegistrationLike | undefined> => {
  const url = new URL(scriptUrl, base);
  try {
    const registration = await container.register(url.href, { scope: new URL('./', url).pathname, type: 'module' });
    await whenActive(registration);
    void dropLegacySubscription(container, registration).catch((error) => {
      log.warn('failed to drop the offline worker push subscription', { error });
    });
    return registration;
  } catch (error) {
    log.warn('push worker registration failed', { error });
    return undefined;
  }
};
