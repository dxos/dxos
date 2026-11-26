//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import type * as Plugin from '@dxos/app-framework/Plugin';

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

/** Loads a plugin from a module URL; the same loader runs in the app, a worker and a frame. */
export const importPlugin = async (url: string): Promise<Plugin.Plugin> => {
  const module: unknown = await import(/* @vite-ignore */ url);
  if (!isPluginModule(module)) {
    throw new Error(`not a plugin module: ${url}`);
  }
  return module.default();
};

const attempt = async (action: () => unknown): Promise<string> => {
  try {
    await action();
    return 'allowed';
  } catch (err) {
    return `refused (${err instanceof Error ? err.name : 'error'})`;
  }
};

const openDatabase = (): Promise<void> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open('org.dxos.stories.services.probe');
    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
    request.onerror = () => reject(request.error ?? new Error('indexedDB refused'));
  });

/** Tries each thing an isolated host should not reach, and reports what happened. */
const probe = async (host: ServiceHost.ServiceHost, origin: string): Promise<HostControl.Probe> => ({
  localStorage:
    'localStorage' in globalThis
      ? await attempt(() => globalThis.localStorage.setItem('org.dxos.stories.services.probe', '1'))
      : 'absent in a worker',
  indexedDb: await attempt(openDatabase),
  network: await attempt(() => fetch(new URL('/index.json', origin), { cache: 'no-store' })),
  // The app's notes, which a frame is not granted.
  ungranted: await attempt(() =>
    Effect.runPromise(host.client(NoteStore.Contract).list({}).pipe(Effect.timeout('1 second'))),
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
