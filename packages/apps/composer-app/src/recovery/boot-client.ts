//
// Copyright 2026 DXOS.org
//

import { Client } from '@dxos/client';
import { mountDevtoolsHooks } from '@dxos/client/devtools';
import { type LocalClientServices, fromHost } from '@dxos/client/local';
import { Config, defs } from '@dxos/config';
import { Runtime_Client_Storage_SqliteMode } from '@dxos/protocols/buf/dxos/config_pb';

import { setupConfig } from '../util';
import { initAutomergeWasm } from '../util/automerge-wasm';

let bootedClient: Client | undefined;

export const isRecoveryClientBooted = (): boolean => bootedClient !== undefined;

export const getRecoveryClient = (): Client | undefined => bootedClient;

/**
 * Boot a minimal in-process client: no plugins, no P2P replication, no vector indexing,
 * spaces are not auto-activated.
 */
export const bootRecoveryClient = async (): Promise<Client> => {
  if (bootedClient) {
    return bootedClient;
  }

  // This client hosts echo in-page; automerge is slim-resolved and must be initialized before
  // it (see util/automerge-wasm.ts).
  await initAutomergeWasm();

  const base = await setupConfig();
  const config = new Config(
    {
      runtime: {
        client: {
          servicesMode: defs.Runtime_Client_ServicesMode.HOST,
          disableP2pReplication: true,
          enableVectorIndexing: false,
          signalTelemetryEnabled: false,
          edgeFeatures: {
            feedReplicator: false,
            subductionReplicator: false,
            signaling: false,
            agents: false,
          },
          storage: {
            sqliteMode: Runtime_Client_Storage_SqliteMode.OPFS,
          },
        },
        services: {
          signaling: [],
          // Recovery is offline/local — no edge fetch (recovery.html CSP blocks external connect-src).
          edge: {
            url: '',
          },
        },
      },
    },
    base.values,
  );

  const services = await fromHost(config, {
    createOpfsWorker: () =>
      new Worker(new URL('@dxos/client/opfs-worker', import.meta.url), {
        type: 'module',
      }),
    runtimeProps: {
      disableP2pReplication: true,
      enableVectorIndexing: false,
      autoActivateSpaces: false,
    },
  });

  const client = new Client({ config, services });
  await client.initialize();
  bootedClient = client;
  mountDevtoolsHooks({ client });
  return client;
};

export const exportBootedSqlite = async (): Promise<Uint8Array> => {
  if (!bootedClient) {
    throw new Error('Client not booted');
  }
  const host = (bootedClient.services as LocalClientServices).host;
  if (!host) {
    throw new Error('Client services host unavailable');
  }
  return host.exportSqliteDatabase();
};

export const destroyRecoveryClient = async (): Promise<void> => {
  if (!bootedClient) {
    return;
  }
  await bootedClient.destroy().catch(() => {});
  bootedClient = undefined;
};
