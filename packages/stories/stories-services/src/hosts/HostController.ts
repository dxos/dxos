//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as EffectEx from '@dxos/effect/EffectEx';

import { NoteStore } from '../contracts/index.ts';
import { type HostControl, ServiceHost } from '../services/index.ts';
import { type Init, importPlugin, isReady, marker } from './child-host.ts';

export const APP_HOST = 'app';

type Child = {
  readonly id: string;
  readonly dispose: () => void;
};

/**
 * The origin a frame host is served from: the same dev server under the other loopback name, which
 * the browser treats as a different origin with its own storage. Production would use a dedicated
 * origin; a sandboxed frame with an opaque origin cannot load module scripts from the app's server,
 * which answers no cross-origin request from a null origin.
 */
const frameOrigin = (): string | undefined => {
  const { protocol, hostname, port } = window.location;
  const other = hostname === 'localhost' ? '127.0.0.1' : hostname === '127.0.0.1' ? 'localhost' : undefined;
  return other === undefined ? undefined : `${protocol}//${other}${port ? `:${port}` : ''}`;
};

/** Writes the marker an isolated host must not see, in the app's local storage and IndexedDB. */
const writeMarker = (): void => {
  const name = marker(window.location.origin);
  window.localStorage.setItem(name, APP_HOST);
  const request = indexedDB.open(name);
  request.onsuccess = () => request.result.close();
};

/**
 * The app's side of the story: the app host, and the worker and frame hosts it starts. The app
 * host supervises its children, which is the arrangement the design proposes for Composer.
 */
export class HostController {
  readonly app: ServiceHost.ServiceHost;
  readonly #children = new Map<string, Child>();
  /** Ids of hosts being started, so a second start of one cannot leave two children under one id. */
  readonly #starting = new Set<string>();

  constructor() {
    this.app = new ServiceHost.ServiceHost({
      id: APP_HOST,
      kind: 'app',
      features: { [NoteStore.STORAGE_FEATURE]: window.localStorage },
      loadPlugin: importPlugin,
    });
    writeMarker();
  }

  has(id: string): boolean {
    return this.#children.has(id);
  }

  /** Runs `start` with `id` reserved, and gives the id back if the child never came up. */
  async #reserve(id: string, start: () => Promise<Child>): Promise<void> {
    if (this.#children.has(id) || this.#starting.has(id)) {
      throw new Error(`host ${id} is already started or starting`);
    }
    this.#starting.add(id);
    try {
      this.#children.set(id, await start());
    } finally {
      this.#starting.delete(id);
    }
  }

  /** Starts a host in a Web Worker. `kind: 'edge'` makes it the story's stand-in for EDGE. */
  async startWorker(id: string, kind: HostControl.Kind, features: readonly string[]): Promise<void> {
    await this.#reserve(id, async () => {
      const worker = new Worker(new URL('./worker-entry.ts', import.meta.url), { type: 'module', name: id });
      try {
        await new Promise<void>((resolve, reject) => {
          worker.addEventListener('message', (event) => isReady(event.data) && resolve(), { once: true });
          worker.addEventListener('error', (event) => reject(new Error(event.message)), { once: true });
        });
        const channel = new MessageChannel();
        const init: Init = { type: 'init', id, kind, features, origin: window.location.origin, port: channel.port2 };
        worker.postMessage(init, [channel.port2]);
        // Resolves once the child's catalog has arrived, so the child is addressable when this returns.
        await this.app.connect(channel.port1);
      } catch (err) {
        worker.terminate();
        throw err;
      }
      return { id, dispose: () => worker.terminate() };
    });
  }

  /** Starts a host in a hidden sandboxed iframe, and serves it only the contracts in `grant`. */
  async startFrame(id: string, features: readonly string[], grant: readonly string[]): Promise<void> {
    const origin = frameOrigin();
    if (origin === undefined) {
      throw new Error('a frame host needs a second origin; open the story on localhost or 127.0.0.1');
    }
    await this.#reserve(id, async () => {
      const page = new URL('./frame.html', import.meta.url);
      const frame = document.createElement('iframe');
      // Scripts run, and the frame keeps the origin it was served from, which is not the app's.
      frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
      frame.style.display = 'none';
      frame.src = `${origin}${page.pathname}`;
      const ready = new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('frame host did not start')), 15_000);
        const listener = (event: MessageEvent) => {
          if (event.source === frame.contentWindow && isReady(event.data)) {
            clearTimeout(timer);
            window.removeEventListener('message', listener);
            resolve();
          }
        };
        window.addEventListener('message', listener);
      });
      document.body.appendChild(frame);
      try {
        await ready;
        const channel = new MessageChannel();
        const init: Init = {
          type: 'init',
          id,
          kind: 'frame',
          features,
          origin: window.location.origin,
          port: channel.port2,
        };
        frame.contentWindow?.postMessage(init, origin, [channel.port2]);
        await this.app.connect(channel.port1, { grant });
      } catch (err) {
        frame.remove();
        throw err;
      }
      return { id, dispose: () => frame.remove() };
    });
  }

  async stop(id: string): Promise<void> {
    const child = this.#children.get(id);
    if (child) {
      this.#children.delete(id);
      await this.app.disconnect(id);
      child.dispose();
    }
  }

  /** The control client of a started child; a child that is not connected is an error, never a silent no-op. */
  #control(hostId: string): HostControl.Client {
    const control = this.app.control(hostId);
    if (!control) {
      throw new Error(`host ${hostId} is not connected`);
    }
    return control;
  }

  /** Installs a plugin into the app host or one of its children, through that host's own contract. */
  async install(hostId: string, pluginUrl: string): Promise<void> {
    if (hostId === APP_HOST) {
      await this.app.install(pluginUrl);
      return;
    }
    await EffectEx.runPromise(this.#control(hostId).install({ plugin: pluginUrl }));
  }

  async uninstall(hostId: string, pluginUrl: string): Promise<void> {
    if (hostId === APP_HOST) {
      await this.app.uninstall(pluginUrl);
      return;
    }
    await EffectEx.runPromise(this.#control(hostId).uninstall({ plugin: pluginUrl }));
  }

  async probe(hostId: string): Promise<HostControl.Probe> {
    return EffectEx.runPromise(this.#control(hostId).probe({ ungranted: NoteStore.Contract.key }));
  }

  async dispose(): Promise<void> {
    await Promise.all([...this.#children.keys()].map((id) => this.stop(id)));
    await this.app.dispose();
  }
}
