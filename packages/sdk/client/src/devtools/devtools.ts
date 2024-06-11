//
// Copyright 2022 DXOS.org
//

import { type Halo, type Space } from '@dxos/client-protocol';
import type { ClientServicesHost, DataSpace } from '@dxos/client-services';
import { importModule } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { createBundledRpcServer, type RpcPeer, type RpcPort } from '@dxos/rpc';
import { TRACE_PROCESSOR, type TraceProcessor, type DiagnosticMetadata } from '@dxos/tracing';
import { joinTables } from '@dxos/util';

import { type Client } from '../client';

// Didn't want to add a dependency on feed store.
type FeedWrapper = unknown;

/**
 * A hook bound to window.__DXOS__.
 */
export interface DevtoolsHook {
  client?: Client;
  host?: ClientServicesHost;

  tracing: TraceProcessor;

  spaces?: Accessor<Space | DataSpace>;
  feeds?: Accessor<FeedWrapper>;
  halo?: Halo;

  openClientRpcServer: () => Promise<boolean>;

  openDevtoolsApp?: () => void;

  downloadDiagnostics?: () => Promise<void>;

  reset: () => void;

  /**
   * Import modules exposed by `exposeModule` from @dxos/debug.
   */
  importModule: (module: string) => unknown;

  listDiagnostics: () => Promise<void>;

  fetchDiagnostics: (id: string, instanceTag?: string) => Promise<void>;

  /**
   * Utility function.
   */
  joinTables: any;
}

export type MountOptions = {
  client?: Client;
  host?: ClientServicesHost;
};

export const mountDevtoolsHooks = ({ client, host }: MountOptions) => {
  let server: RpcPeer;

  let diagnostics: DiagnosticMetadata[] = [];

  const hook: DevtoolsHook = {
    // To debug client from console using 'window.__DXOS__.client'.
    client,
    host,

    tracing: TRACE_PROCESSOR,

    openClientRpcServer: async () => {
      if (!client) {
        log.error('Client not available');
        return false;
      }

      if (server) {
        log('Closing existing client RPC server.');
        await server.close();
      }

      log('Opening devtools client RPC server...');
      server = createBundledRpcServer({
        services: client.services.descriptors,
        handlers: client.services.services,
        port,
      });

      await server.open().catch((err) => {
        log.error(`Failed to open RPC server: ${err}`);
        return false;
      });

      log('Opened devtools client RPC server.');
      return true;
    },

    reset,

    importModule,

    listDiagnostics: async () => {
      diagnostics = await TRACE_PROCESSOR.diagnosticsChannel.discover();
      // eslint-disable-next-line no-console
      console.table(
        diagnostics.map((diagnostic) => ({
          ...diagnostic,
          get fetch() {
            queueMicrotask(async () => {
              // eslint-disable-next-line no-console
              const { data, error } = await TRACE_PROCESSOR.diagnosticsChannel.fetch(diagnostic);
              if (error) {
                log.error(`Error fetching diagnostic ${diagnostic.id}: ${error}`);
                return;
              }

              // eslint-disable-next-line no-console
              console.table(data);
            });
            return undefined;
          },
        })),
      );
    },

    // TODO(dmaretskyi): Joins across multiple diagnostics.
    fetchDiagnostics: async (id, instanceTag) => {
      if (diagnostics.length === 0) {
        diagnostics = await TRACE_PROCESSOR.diagnosticsChannel.discover();
      }

      let diagnostic = diagnostics.find((d) => d.id === id && (instanceTag ? d.instanceTag === instanceTag : true));
      if (!diagnostic) {
        diagnostics = await TRACE_PROCESSOR.diagnosticsChannel.discover();
      }

      diagnostic = diagnostics.find((d) => d.id === id && (instanceTag ? d.instanceTag === instanceTag : true));
      if (!diagnostic) {
        log.error(`Diagnostic ${id} not found.`);
        return;
      }

      const { data, error } = await TRACE_PROCESSOR.diagnosticsChannel.fetch(diagnostic);
      if (error) {
        log.error(`Error fetching diagnostic ${id}: ${error}`);
        return;
      }

      return data;
    },

    joinTables,
  };

  if (client) {
    hook.spaces = createAccessor({
      getAll: () => client.spaces.get(),
      getByKey: (key) => client.spaces.get().find((space) => space.key.equals(key)),
      getSearchMap: () =>
        new Map(
          client.spaces.get().flatMap((space) => [
            [space.key.toHex(), space],
            [space.properties.name, space],
          ]),
        ),
    });
    hook.halo = client.halo;

    hook.openDevtoolsApp = async () => {
      const vault = client.config?.values.runtime?.client?.remoteSource ?? 'https://halo.dxos.org';

      // Check if we're serving devtools locally on the usual port.
      let hasLocalDevtools = false;
      try {
        await fetch('http://localhost:5174/');
        hasLocalDevtools = true;
      } catch {}

      const isDev = window.location.href.includes('.dev.') || window.location.href.includes('localhost');
      const devtoolsApp = hasLocalDevtools
        ? 'http://localhost:5174/'
        : `https://devtools${isDev ? '.dev.' : '.'}dxos.org/`;
      const devtoolsUrl = `${devtoolsApp}?target=${vault}`;
      window.open(devtoolsUrl, '_blank');
    };

    hook.downloadDiagnostics = async () => {
      const diagnostics = JSON.stringify(await client.diagnostics(), null, 4);
      const url = URL.createObjectURL(new Blob([diagnostics], { type: 'application/json' }));
      const element = document.createElement('a');
      element.setAttribute('href', url);
      element.setAttribute('download', `diagnostics-${window.location.hostname}-${new Date().toISOString()}.json`);
      element.setAttribute('target', 'download');
      element.click();
    };
  }
  if (host) {
    hook.spaces = createAccessor({
      getAll: () => Array.from(host.context.dataSpaceManager?.spaces.values() ?? []),
      getByKey: (key) => host.context.dataSpaceManager?.spaces.get(key),
      getSearchMap: () =>
        new Map(
          Array.from(host.context.dataSpaceManager?.spaces.values() ?? []).flatMap((space) => [
            [space.key.toHex(), space],
          ]),
        ),
    });

    hook.feeds = createAccessor({
      getAll: () => Array.from(host.context.feedStore?.feeds.values() ?? []),
      getByKey: (key) => host.context.feedStore?.feeds.find((feed) => feed.key.equals(key)),
      getSearchMap: () =>
        new Map(Array.from(host.context.feedStore?.feeds.values() ?? []).flatMap((feed) => [[feed.key.toHex(), feed]])),
    });
  }

  ((globalThis as any).__DXOS__ as DevtoolsHook) = hook;

  let warningShown = false;
  Object.defineProperty(globalThis, 'dxos', {
    get: () => {
      if (!warningShown) {
        warningShown = true;
        log.warn('globalThis.dxos is an undocumented API and may changed or removed entirely without notice.');
      }
      return hook;
    },
    configurable: true,
  });
};

export const unmountDevtoolsHooks = () => {
  delete (globalThis as any).__DXOS__;
  delete (globalThis as any).dxos;
};

type AccessorOptions<T> = {
  getAll?: () => T[];
  getByKey?: (key: PublicKey) => T | undefined;
  getSearchMap?: () => Map<string, T>;
};

type Accessor<T> = {
  (keyOrSearch: PublicKey | string): T | undefined;
  (): T[];
};

const createAccessor =
  <T>({ getByKey, getSearchMap, getAll }: AccessorOptions<T>): Accessor<T> =>
  (keyOrSearch?: PublicKey | string) => {
    if (typeof keyOrSearch === 'undefined') {
      return getAll?.() ?? [];
    }
    if (keyOrSearch instanceof PublicKey) {
      return getByKey?.(keyOrSearch);
    }
    const searchSpace = getSearchMap?.() ?? new Map();
    if (searchSpace.has(keyOrSearch)) {
      return searchSpace.get(keyOrSearch);
    }
    for (const [key, value] of searchSpace.entries()) {
      if (key.startsWith(keyOrSearch)) {
        return value;
      }
    }
    for (const [key, value] of searchSpace.entries()) {
      if (key.includes(keyOrSearch)) {
        return value;
      }
    }
    return undefined;
  };

const port: RpcPort = {
  send: async (message) =>
    window.postMessage(
      {
        data: Array.from(message),
        source: 'dxos-client',
      },
      '*',
    ),

  subscribe: (callback) => {
    const handler = (event: MessageEvent<any>) => {
      if (event.source !== window) {
        return;
      }

      const message = event.data;
      if (typeof message !== 'object' || message === null || message.source !== 'content-script') {
        return;
      }

      callback(new Uint8Array(message.data));
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  },
};

/**
 * Delete all data in the browser without depending on other packages.
 */
const reset = async () => {
  log.info(`Deleting all data from ${typeof window.localStorage !== 'undefined' ? window.location?.origin : ''}`);

  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
    log.info('Cleared local storage');
  }

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.storage !== 'undefined' &&
    typeof navigator.storage.getDirectory === 'function'
  ) {
    const root = await navigator.storage.getDirectory();
    for await (const entry of (root as any).keys() as Iterable<string>) {
      try {
        await root.removeEntry(entry, { recursive: true });
      } catch (err) {
        log.error(`Failed to delete ${entry}: ${err}`);
      }
    }
    log.info('Cleared OPFS');

    if (typeof location !== 'undefined' && typeof location.reload === 'function') {
      location.reload();
    } else if (typeof close === 'function') {
      close(); // For web workers.
    }
  }
};
