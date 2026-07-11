//
// Copyright 2022 DXOS.org
//

import { type ClientServicesProvider } from '@dxos/client-protocol';
import { type Config } from '@dxos/config';
import { Runtime } from '@dxos/protocols/proto/dxos/config';

import { DedicatedWorkerClientServices, type DedicatedWorkerClientServicesOptions } from './dedicated';
import { SharedWorkerCoordinator, SingleClientCoordinator } from './dedicated';
import { type LocalClientServicesParams, fromHost } from './local-client-services';
import { fromSocket } from './socket';

export type CreateClientServicesOptions = {
  /** @deprecated The SHARED_WORKER services mode was removed; retained only for source compatibility. */
  createWorker?: () => SharedWorker;
  /** Factory for creating a dedicated worker. Required for {@link Runtime.Client.ServicesMode.DEDICATED_WORKER}. */
  createDedicatedWorker?: DedicatedWorkerClientServicesOptions['createWorker'];
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
  const { createDedicatedWorker, createCoordinatorWorker, createOpfsWorker, sqlitePath } = options;

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

  // UNSPECIFIED_SERVICES_MODE == 0, so falsy check also catches it.
  const servicesMode = config.values.runtime?.client?.servicesMode;
  if (!servicesMode) {
    throw new Error(
      'createClientServices: runtime.client.services_mode is not set; required when no remote_source is configured.',
    );
  }

  switch (servicesMode) {
    case Runtime.Client.ServicesMode.HOST: {
      // Derive sqlitePath from dataRoot when not explicitly provided (only meaningful when the
      // config selects FILE sqlite mode — LocalClientServices ignores sqlitePath otherwise).
      const dataRoot = config.values.runtime?.client?.storage?.dataRoot;
      const effectiveSqlitePath = sqlitePath ?? (dataRoot ? `${dataRoot}/sqlite.db` : undefined);
      return fromHost(config, { createOpfsWorker, sqlitePath: effectiveSqlitePath });
    }

    case Runtime.Client.ServicesMode.SHARED_WORKER: {
      // The shared-worker services mode was removed in favour of the dedicated-worker framework
      // (leader election + coordinator). Its client/host plumbing still rides the legacy protobuf
      // system peer and is no longer wired up.
      throw new Error(
        'createClientServices: runtime.client.services_mode=SHARED_WORKER is no longer supported; use DEDICATED_WORKER.',
      );
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
