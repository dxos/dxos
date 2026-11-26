//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import type * as Plugin from '@dxos/app-framework/Plugin';
import * as EffectEx from '@dxos/effect/EffectEx';

import { NoteStore, Summarizer } from '../contracts/index.ts';
import { type HostControl, ServiceHost } from '../services/index.ts';
import { fakeGateway } from './gateway.ts';

/** What the app sends a worker or frame to start a host in it. */
export type Init = {
  readonly type: 'init';
  readonly id: string;
  readonly kind: HostControl.Kind;
  /** Names of the features this host is given; their values are built here, since they cannot cross a port. */
  readonly features: readonly string[];
  /** The app's origin, which the probe tries to reach. */
  readonly origin: string;
  readonly port: MessagePort;
};

export const isInit = (data: unknown): data is Init =>
  typeof data === 'object' && data !== null && 'type' in data && data.type === 'init' && 'port' in data;

export const READY = { type: 'ready' } as const;

export const isReady = (data: unknown): boolean =>
  typeof data === 'object' && data !== null && 'type' in data && data.type === READY.type;

const isPluginModule = (module: unknown): module is { default: () => Plugin.Plugin } =>
  typeof module === 'object' && module !== null && 'default' in module && typeof module.default === 'function';

/**
 * Loads a plugin from a module path; the same loader runs in the app, a worker and a frame. The
 * path is resolved against the host's own origin, since a frame may import only from where it was
 * served.
 */
export const importPlugin = async (path: string): Promise<Plugin.Plugin> => {
  const url = new URL(path, globalThis.location.href).href;
  const module: unknown = await import(/* @vite-ignore */ url);
  if (!isPluginModule(module)) {
    throw new Error(`not a plugin module: ${url}`);
  }
  return module.default();
};

/** A key and a database the app writes at its own origin, which an isolated host must not be able to see. */
export const MARKER = 'org.dxos.stories.services.marker';

const attempt = async (action: () => unknown): Promise<string> => {
  try {
    await action();
    return 'allowed';
  } catch (err) {
    return `refused (${err instanceof Error ? err.name : 'error'})`;
  }
};

/** Whether this realm can read what the app stored: `sees the app's data`, `isolated`, or why it could not look. */
const visibility = async (look: () => boolean | Promise<boolean>): Promise<string> => {
  try {
    return (await look()) ? "sees the app's data" : 'isolated';
  } catch (err) {
    return `refused (${err instanceof Error ? err.name : 'error'})`;
  }
};

/**
 * Whether this realm may request an image from `origin`: a path `fetch` does not cover, since a
 * policy governs images separately. Decided by the policy's own violation report, not by whether
 * the image decodes.
 */
const requestImage = (origin: string): Promise<string> =>
  new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve('no document');
      return;
    }
    let settled = false;
    const finish = (result: string) => {
      if (!settled) {
        settled = true;
        document.removeEventListener('securitypolicyviolation', onViolation);
        resolve(result);
      }
    };
    const onViolation = (event: SecurityPolicyViolationEvent) => {
      if (event.effectiveDirective.startsWith('img-src')) {
        finish('refused');
      }
    };
    document.addEventListener('securitypolicyviolation', onViolation);
    const image = new Image();
    // The request left the frame whether or not the response is an image.
    image.onload = () => finish('allowed');
    image.onerror = () => setTimeout(() => finish('allowed'), 100);
    image.src = new URL('/index.json?probe', origin).href;
  });

/** Tries each thing an isolated host should not reach, and reports what happened. */
const probe = async (host: ServiceHost.ServiceHost, origin: string): Promise<HostControl.Probe> => ({
  localStorage:
    'localStorage' in globalThis
      ? await visibility(() => globalThis.localStorage.getItem(MARKER) !== null)
      : 'absent in a worker',
  indexedDb: await visibility(async () => (await indexedDB.databases()).some((database) => database.name === MARKER)),
  network: `fetch ${await attempt(() => fetch(new URL('/index.json', origin), { cache: 'no-store' }))}, image ${await requestImage(origin)}`,
  // The app's notes, which a frame is not granted.
  ungranted: await attempt(() =>
    EffectEx.runPromise(host.client(NoteStore.Contract).list({}).pipe(Effect.timeout('1 second'))),
  ),
});

/** Starts a host in this realm and connects it to the app over the port it was sent. */
export const startChildHost = (init: Init): ServiceHost.ServiceHost => {
  const features: Record<string, unknown> = {};
  if (init.features.includes(Summarizer.GATEWAY_FEATURE)) {
    features[Summarizer.GATEWAY_FEATURE] = fakeGateway(init.id);
  }
  const host: ServiceHost.ServiceHost = new ServiceHost.ServiceHost({
    id: init.id,
    kind: init.kind,
    features,
    loadPlugin: importPlugin,
    probe: () => probe(host, init.origin),
  });
  void host.connect(init.port);
  return host;
};
