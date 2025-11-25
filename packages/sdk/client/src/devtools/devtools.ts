//
// Copyright 2022 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { cbor } from '@automerge/automerge-repo';

import { type Halo, type Space } from '@dxos/client-protocol';
import { type ClientServicesHost, type DataSpace } from '@dxos/client-services';
import { exposeModule, importModule } from '@dxos/debug';
import { Filter, Obj, Query, Ref, Relation, Type } from '@dxos/echo';
import { PublicKey } from '@dxos/keys';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { type RpcPeer, type RpcPort, createBundledRpcServer } from '@dxos/rpc';
import { type DiagnosticMetadata, TRACE_PROCESSOR, type TraceProcessor } from '@dxos/tracing';
import { joinTables } from '@dxos/util';

import { type Client } from '../client';
import { SpaceState } from '../echo';

// Didn't want to add a dependency on feed store.
type FeedWrapper = unknown;

// TODO(burdon): Remove.
const getMeta = Obj.getMeta;

exposeModule('@automerge/automerge', A);

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

  /**
   * Resolves the DXN.
   * @param id - The DXN or DXN ID or object ID or text query.
   */
  get?(id: string | DXN): Promise<any>;

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

  exportProfile?: () => Promise<void>;

  importProfile?: () => Promise<void>;

  /**
   * Utility function.
   */
  joinTables: any;

  // Globals/
  DXN: typeof DXN;
  Type: typeof Type;
  Obj: typeof Obj;
  Relation: typeof Relation;
  Ref: typeof Ref;
  Query: typeof Query;
  Filter: typeof Filter;

  getMeta: typeof getMeta;
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

      console.table(
        diagnostics.map((diagnostic) => ({
          ...diagnostic,
          get fetch() {
            queueMicrotask(async () => {
              const { data, error } = await TRACE_PROCESSOR.diagnosticsChannel.fetch(diagnostic);
              if (error) {
                log.error(`Error fetching diagnostic ${diagnostic.id}: ${error}`);
                return;
              }

              console.table(data);
            });
            return undefined;
          },
        })),
      );
    },

    // TODO(dmaretskyi): Joins across multiple diagnostics.
    fetchDiagnostics: async (id, instanceTag) => {
      const { data, error } = await TRACE_PROCESSOR.diagnosticsChannel.fetch({ id, instanceTag });
      if (error) {
        log.error(`Error fetching diagnostic ${id}: ${error}`);
        return;
      }

      return data;
    },

    joinTables,

    // Globals.
    DXN,
    Type,
    Obj,
    Ref,
    Relation,
    Query,
    Filter,
    getMeta,
  };

  if (client) {
    hook.halo = client.halo;
    hook.spaces = createAccessor({
      getAll: () => client.spaces.get(),
      getByKey: (key) => client.spaces.get().find((space) => space.key.equals(key)),
      getSearchMap: () =>
        new Map(
          client.spaces
            .get()
            .flatMap((space) => [
              [space.id, space],
              ...(space.state.get() === SpaceState.SPACE_READY
                ? ([[space.properties.name ?? '', space]] as const)
                : []),
              [space.key.toHex(), space],
            ]),
        ),
    });

    hook.get = async (dxn) => {
      if (typeof dxn === 'string') {
        dxn = DXN.parse(dxn);
      }
      return client.graph.createRefResolver({}).resolve(dxn);
    };

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
      downloadFile(
        diagnostics,
        'application/json',
        `diagnostics-${window.location.hostname}-${new Date().toISOString()}.json`,
      );
    };

    hook.exportProfile = async () => {
      const { createLevel, createStorageObjects, exportProfileData } = await import('@dxos/client-services');

      const storageConfig = client.config.get('runtime.client.storage', {})!;

      const { storage } = createStorageObjects(storageConfig);
      const level = await createLevel(storageConfig);

      log.info('begin profile export', { storageConfig });
      const archive = await exportProfileData({ storage, level });

      log.info('done profile export', { storageEntries: archive.storage.length });

      downloadFile(cbor.encode(archive), 'application/octet-stream', 'profile.dxprofile');
    };

    hook.importProfile = async () => {
      log.warn('Make sure to clear your data before importing a profile (Site Settings -> Clear data)');

      const data = await uploadFile();

      const { createLevel, createStorageObjects, decodeProfileArchive, importProfileData } = await import(
        '@dxos/client-services'
      );

      const storageConfig = client.config.get('runtime.client.storage', {})!;

      // Kill client so it doesn't interfere.
      await client.destroy().catch(() => {});

      const { storage } = createStorageObjects(storageConfig);
      const level = await createLevel(storageConfig);

      const archive = decodeProfileArchive(data);
      log.info('begin profile import', { storageConfig, storageEntries: archive.storage.length });

      await importProfileData({ storage, level }, archive);

      log.info('done profile import');

      window.location.reload();
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

const downloadFile = (data: string | Uint8Array, contentType: string, filename: string) => {
  const url = URL.createObjectURL(new Blob([data as Uint8Array<ArrayBuffer>], { type: contentType }));
  const element = document.createElement('a');
  element.setAttribute('href', url);
  element.setAttribute('download', filename);
  element.setAttribute('target', 'download');
  element.click();
};

const uploadFile = (): Promise<Uint8Array> => {
  return new Promise((resolve, reject) => {
    const dropArea = document.createElement('div');
    dropArea.style.width = '100%';
    dropArea.style.height = '100%';
    dropArea.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    dropArea.style.display = 'flex';
    dropArea.style.justifyContent = 'center';
    dropArea.style.alignItems = 'center';
    dropArea.style.position = 'fixed';

    const text = document.createElement('p');
    text.textContent = 'Drop file here';
    text.style.color = 'white';
    text.style.fontSize = '24px';

    dropArea.appendChild(text);
    document.body.appendChild(dropArea);

    const handleDrop = (event: DragEvent) => {
      event.preventDefault();
      const file = event.dataTransfer?.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          const arrayBuffer = reader.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer);
          resolve(uint8Array);
        };
        reader.onerror = () => {
          reject(new Error('Failed to read file'));
        };
        reader.readAsArrayBuffer(file);
      }
      dropArea.remove();
    };

    const handleDragOver = (event: DragEvent) => {
      event.preventDefault();
    };

    const handleDragLeave = () => {
      dropArea.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    };

    const handleDragEnter = () => {
      dropArea.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    };

    dropArea.addEventListener('drop', handleDrop);
    dropArea.addEventListener('dragover', handleDragOver);
    dropArea.addEventListener('dragleave', handleDragLeave);
    dropArea.addEventListener('dragenter', handleDragEnter);
  });
};
