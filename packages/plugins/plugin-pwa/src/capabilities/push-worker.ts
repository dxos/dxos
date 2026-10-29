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
  readonly active: object | null;
  readonly installing: WorkerLike | null;
  readonly waiting: WorkerLike | null;
  readonly pushManager: PushManagerLike;
};

/** The part of `navigator.serviceWorker` push worker registration uses. */
export type ServiceWorkerContainerLike = {
  register: (scriptUrl: string, options: { scope: string; type: 'module' }) => Promise<PushWorkerRegistrationLike>;
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
    return registration;
  } catch (error) {
    log.warn('push worker registration failed', { error });
    return undefined;
  }
};
