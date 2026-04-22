//
// Copyright 2022 DXOS.org
//

import { type ClientServicesProvider } from '@dxos/client-protocol';
import { type Config } from '@dxos/config';
import { Runtime } from '@dxos/protocols/proto/dxos/config';

import { type DedeciatedWorkerClientServicesOptions, DedicatedWorkerClientServices } from './dedicated';
import { SharedWorkerCoordinator, SingleClientCoordinator } from './dedicated';
import { type LocalClientServicesParams, fromHost } from './local-client-services';
import { fromSocket } from './socket';
import { type WorkerClientServicesProps, fromWorker } from './worker-client-services';

export type CreateClientServicesOptions = {
  /** Factory for creating a shared worker. Required for {@link Runtime.Client.ServicesMode.SHARED_WORKER}. */
  createWorker?: WorkerClientServicesProps['createWorker'];
  /** Factory for creating a dedicated worker. Required for {@link Runtime.Client.ServicesMode.DEDICATED_WORKER}. */
  createDedicatedWorker?: DedeciatedWorkerClientServicesOptions['createWorker'];
  /** Factory for creating the coordinator SharedWorker (for dedicated worker mode). Use for a custom entrypoint that e.g. initializes observability. */
  createCoordinatorWorker?: () => SharedWorker;
  /** Factory for creating an OPFS worker. */
  createOpfsWorker?: LocalClientServicesParams['createOpfsWorker'];
  /** Path to SQLite database file for persistent indexing in Node/Bun. */
  sqlitePath?: LocalClientServicesParams['sqlitePath'];
};

/**
 * Create services from config.
 *
 * The deployment mode is chosen exclusively from `runtime.client.services_mode` (or
 * `runtime.client.remote_source` for a remote services endpoint). If the selected mode requires a
 * worker factory that was not supplied via {@link CreateClientServicesOptions}, this function
 * throws — there is no implicit fallback.
 */
export const createClientServices = async (
  config: Config,
  options: CreateClientServicesOptions = {},
): Promise<ClientServicesProvider> => {
  const { createWorker, createDedicatedWorker, createCoordinatorWorker, createOpfsWorker, sqlitePath } = options;

  // Remote services take precedence (proxy to a remote vault over a socket, etc.).
  const remote = config.values.runtime?.client?.remoteSource;
  if (remote) {
    const url = new URL(remote);
    const protocol = url.protocol.slice(0, -1);
    switch (protocol) {
      case 'ws':
      case 'wss': {
        return fromSocket(remote, config.values.runtime?.client?.remoteSourceAuthenticationToken);
      }

      case 'http':
      case 'https': {
        throw new Error('IFrame services deprecated.');
      }
    }
  }

  const servicesMode = config.values.runtime?.client?.servicesMode;
  if (!servicesMode || servicesMode === Runtime.Client.ServicesMode.UNSPECIFIED_SERVICES_MODE) {
    throw new Error(
      'createClientServices: runtime.client.services_mode is not set; required when no remote_source is configured.',
    );
  }

  switch (servicesMode) {
    case Runtime.Client.ServicesMode.HOST: {
      // Derive sqlitePath from dataRoot when not explicitly provided (matches CLI behavior).
      const dataRoot = config.values.runtime?.client?.storage?.dataRoot;
      const isPersistant = config.values.runtime?.client?.storage?.persistent;
      const effectiveSqlitePath = sqlitePath ?? (isPersistant && dataRoot ? `${dataRoot}/sqlite.db` : undefined);
      return fromHost(config, { createOpfsWorker, sqlitePath: effectiveSqlitePath });
    }

    case Runtime.Client.ServicesMode.SHARED_WORKER: {
      if (!createWorker) {
        throw new Error(
          'createClientServices: runtime.client.services_mode=SHARED_WORKER requires a createWorker option.',
        );
      }
      return fromWorker(config, { createWorker });
    }

    case Runtime.Client.ServicesMode.DEDICATED_WORKER: {
      if (!createDedicatedWorker) {
        throw new Error(
          'createClientServices: runtime.client.services_mode=DEDICATED_WORKER requires a createDedicatedWorker option.',
        );
      }
      const singleClientMode = config.values.runtime?.client?.singleClientMode;
      return new DedicatedWorkerClientServices({
        createWorker: createDedicatedWorker,
        createCoordinator: () =>
          singleClientMode
            ? new SingleClientCoordinator()
            : createCoordinatorWorker
              ? new SharedWorkerCoordinator(createCoordinatorWorker)
              : new SharedWorkerCoordinator(),
        config,
      });
    }

    default: {
      throw new Error(`createClientServices: unknown services_mode ${servicesMode}`);
    }
  }
};
