//
// Copyright 2022 DXOS.org
//

import { type ClientServicesProvider } from '@dxos/client-protocol';
import { type Config } from '@dxos/config';
import { raise } from '@dxos/debug';
import { Runtime } from '@dxos/protocols/proto/dxos/config';
import * as Coordinator from '@dxos/worker-framework/Coordinator';

import { DedicatedWorkerClientServices, type DedicatedWorkerClientServicesOptions } from './dedicated';
import { type LocalClientServicesParams, fromHost } from './local-client-services';

export type CreateClientServicesOptions = {
  /** Factory for creating a dedicated worker. Required for {@link Runtime.Client.ServicesMode.DEDICATED_WORKER}. */
  createDedicatedWorker?: DedicatedWorkerClientServicesOptions['createWorker'];
  /** Factory for creating the coordinator SharedWorker (for dedicated worker mode). Use for a custom entrypoint that e.g. initializes observability. */
  createCoordinatorWorker?: () => SharedWorker;
  /** Factory for creating an OPFS worker. */
  createOpfsWorker?: LocalClientServicesParams['createOpfsWorker'];
  /** Path to SQLite database file for persistent indexing in Node/Bun. */
  sqlitePath?: LocalClientServicesParams['sqlitePath'];
  /** Escalation hook for persistent worker-connection failures (dedicated worker mode). See {@link DedicatedWorkerClientServicesOptions.onPersistentFailure}. */
  onPersistentWorkerFailure?: DedicatedWorkerClientServicesOptions['onPersistentFailure'];
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
  const { createDedicatedWorker, createCoordinatorWorker, createOpfsWorker, sqlitePath, onPersistentWorkerFailure } =
    options;

  // The legacy protobuf byte-transport remote providers (websocket `fromSocket`, unix-socket
  // `fromAgent`, iframe) have been removed; a `remote_source` endpoint is no longer supported until
  // it is reintroduced over the effect-rpc transport.
  const remote = config.values.runtime?.client?.remoteSource;
  if (remote) {
    throw new Error(
      `createClientServices: runtime.client.remote_source (${remote}) is no longer supported; the legacy protobuf remote transports were removed.`,
    );
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

    case Runtime.Client.ServicesMode.DEDICATED_WORKER: {
      if (!createDedicatedWorker) {
        throw new Error(
          'createClientServices: runtime.client.services_mode=DEDICATED_WORKER requires a createDedicatedWorker option.',
        );
      }
      const singleClientMode = config.values.runtime?.client?.singleClientMode;
      return new DedicatedWorkerClientServices({
        createWorker: createDedicatedWorker,
        createCoordinator: async () =>
          singleClientMode
            ? new Coordinator.SingleClient()
            : createCoordinatorWorker
              ? new Coordinator.SharedWorker({ createWorker: createCoordinatorWorker })
              : raise(new TypeError('createCoordinatorWorker is required when singleClientMode is false')),
        config,
        onPersistentFailure: onPersistentWorkerFailure,
      });
    }

    default: {
      throw new Error(`createClientServices: unknown services_mode ${servicesMode}`);
    }
  }
};
