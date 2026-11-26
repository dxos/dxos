//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import { NoteStore, Summarizer } from '../contracts/index.ts';
import { type HostControl, ServiceHost } from '../services/index.ts';
import { type Init, importPlugin, isReady } from './child-host.ts';
import frameEntryUrl from './frame-entry.ts?module-url';
import { fakeGateway } from './gateway.ts';

export const APP_HOST = 'app';

type Child = {
  readonly id: string;
  readonly dispose: () => void;
};

/** The document a frame host runs in: no storage, no network, and scripts only from the app's origin. */
const frameDocument = (origin: string, entryUrl: string): string =>
  [
    '<!doctype html><html><head>',
    `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${origin} 'unsafe-inline'; connect-src 'none'">`,
    '</head><body>',
    `<script type="module" src="${entryUrl}"></script>`,
    '</body></html>',
  ].join('');

/**
 * The app's side of the story: the app host, and the worker and frame hosts it starts. The app
 * host supervises its children, which is the arrangement the design proposes for Composer.
 */
export class HostController {
  readonly app: ServiceHost.ServiceHost;
  readonly #children = new Map<string, Child>();

  constructor() {
    this.app = new ServiceHost.ServiceHost({
      id: APP_HOST,
      kind: 'app',
      features: { [NoteStore.STORAGE_FEATURE]: window.localStorage },
      loadPlugin: importPlugin,
    });
  }

  has(id: string): boolean {
    return this.#children.has(id);
  }

  /** Starts a host in a Web Worker. `kind: 'edge'` makes it the story's stand-in for EDGE. */
  async startWorker(id: string, kind: HostControl.Kind, features: readonly string[]): Promise<void> {
    const worker = new Worker(new URL('./worker-entry.ts', import.meta.url), { type: 'module', name: id });
    await new Promise<void>((resolve, reject) => {
      worker.addEventListener('message', (event) => isReady(event.data) && resolve(), { once: true });
      worker.addEventListener('error', (event) => reject(new Error(event.message)), { once: true });
    });
    const channel = new MessageChannel();
    const init: Init = { type: 'init', id, kind, features, origin: window.location.origin, port: channel.port2 };
    worker.postMessage(init, [channel.port2]);
    await this.app.connect(channel.port1);
    this.#children.set(id, { id, dispose: () => worker.terminate() });
  }

  /** Starts a host in a hidden sandboxed iframe, and serves it only the contracts in `grant`. */
  async startFrame(id: string, features: readonly string[], grant: readonly string[]): Promise<void> {
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.style.display = 'none';
    frame.srcdoc = frameDocument(window.location.origin, frameEntryUrl);
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
    } catch (err) {
      frame.remove();
      throw err;
    }
    const channel = new MessageChannel();
    const init: Init = { type: 'init', id, kind: 'frame', features, origin: window.location.origin, port: channel.port2 };
    frame.contentWindow?.postMessage(init, '*', [channel.port2]);
    await this.app.connect(channel.port1, { grant });
    this.#children.set(id, { id, dispose: () => frame.remove() });
  }

  async stop(id: string): Promise<void> {
    const child = this.#children.get(id);
    if (child) {
      this.#children.delete(id);
      await this.app.disconnect(id);
      child.dispose();
    }
  }

  /** Installs a plugin into the app host or one of its children, through that host's own contract. */
  async install(hostId: string, pluginUrl: string): Promise<void> {
    if (hostId === APP_HOST) {
      await this.app.install(pluginUrl);
      return;
    }
    const control = this.app.control(hostId);
    if (control) {
      await Effect.runPromise(control.install({ plugin: pluginUrl }));
    }
  }

  async uninstall(hostId: string, pluginUrl: string): Promise<void> {
    if (hostId === APP_HOST) {
      await this.app.uninstall(pluginUrl);
      return;
    }
    const control = this.app.control(hostId);
    if (control) {
      await Effect.runPromise(control.uninstall({ plugin: pluginUrl }));
    }
  }

  /** Gives the app host a gateway of its own, or takes it away. */
  async setAppGateway(enabled: boolean): Promise<void> {
    await this.app.setFeature(Summarizer.GATEWAY_FEATURE, enabled ? fakeGateway(APP_HOST) : undefined);
  }

  async probe(hostId: string): Promise<HostControl.Probe | undefined> {
    const control = this.app.control(hostId);
    return control ? Effect.runPromise(control.probe({ ungranted: NoteStore.Contract.key })) : undefined;
  }

  async dispose(): Promise<void> {
    await Promise.all([...this.#children.keys()].map((id) => this.stop(id)));
    await this.app.dispose();
  }
}
