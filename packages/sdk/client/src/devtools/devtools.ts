//
// Copyright 2022 DXOS.org
//

import { type Space } from '@dxos/client-protocol';
import type { ClientServicesHost, DataSpace } from '@dxos/client-services';
import { DocumentModel, type DocumentModelState } from '@dxos/document-model';
import { TYPE_PROPERTIES } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { createBundledRpcServer, type RpcPeer, type RpcPort } from '@dxos/rpc';

import { type Client } from '../client';

// Didn't want to add a dependency on feed store.
type FeedWrapper = unknown;

/**
 * A hook bound to window.__DXOS__.
 */
export interface DevtoolsHook {
  client?: Client;
  host?: ClientServicesHost;

  spaces?: Accessor<Space | DataSpace>;
  feeds?: Accessor<FeedWrapper>;

  openClientRpcServer: () => Promise<boolean>;
}

export type MountOptions = {
  client?: Client;
  host?: ClientServicesHost;
};

export const mountDevtoolsHooks = ({ client, host }: MountOptions) => {
  let server: RpcPeer;

  const hook: DevtoolsHook = {
    // To debug client from console using 'window.__DXOS__.client'.
    client,
    host,

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
  }
  if (host) {
    hook.spaces = createAccessor({
      getAll: () => Array.from(host.context.dataSpaceManager?.spaces.values() ?? []),
      getByKey: (key) => host.context.dataSpaceManager?.spaces.get(key),
      getSearchMap: () =>
        new Map(
          Array.from(host.context.dataSpaceManager?.spaces.values() ?? []).flatMap((space) => [
            [space.key.toHex(), space],
            [getSpaceName(space), space],
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
  ((globalThis as any).dxos as DevtoolsHook) = hook;
};

export const unmountDevtoolsHooks = () => {
  delete (globalThis as any).__DXOS__;
  delete (globalThis as any).dxos;
};

const getSpaceName = (space: DataSpace): string => {
  try {
    // Add properties to cache.
    const propertiesItem = space.dataPipeline.itemManager.items.find(
      (item) =>
        item.modelMeta?.type === DocumentModel.meta.type &&
        (item.state as DocumentModelState)?.type?.itemId === TYPE_PROPERTIES,
    );

    const state = propertiesItem?.state as DocumentModelState;
    const properties = state?.data;
    return properties.name ?? '';
  } catch {
    return '';
  }
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
