//
// Copyright 2022 DXOS.org
//

import UAParser from 'ua-parser-js';

import { type ClientServicesProvider } from '@dxos/client-protocol';
import { type Config } from '@dxos/config';

import { type DedeciatedWorkerClientServicesOptions, DedicatedWorkerClientServices } from './dedicated';
import { SharedWorkerCoordinator, SingleClientCoordinator } from './dedicated';
import { type LocalClientServicesParams, fromHost } from './local-client-services';
import { fromSocket } from './socket';
import { type WorkerClientServicesProps, fromWorker } from './worker-client-services';

export type CreateClientServicesOptions = {
  /** Factory for creating a shared worker. */
  createWorker?: WorkerClientServicesProps['createWorker'];
  /** Factory for creating a dedicated worker. */
  createDedicatedWorker?: DedeciatedWorkerClientServicesOptions['createWorker'];
  /** Factory for creating the coordinator SharedWorker (for dedicated worker mode). Use for a custom entrypoint that e.g. initializes observability. */
  createCoordinatorWorker?: () => SharedWorker;
  /** Factory for creating an OPFS worker. */
  createOpfsWorker?: LocalClientServicesParams['createOpfsWorker'];
  /**
   * Use single-client mode for the dedicated worker coordinator.
   * This bypasses SharedWorker which doesn't work on iOS WKWebView.
   */
  singleClientMode?: boolean;
  /** Observability group sent with signaling metadata. */
  observabilityGroup?: string;
  /** Enable telemetry metadata sent with signaling requests. */
  signalTelemetryEnabled?: boolean;
  /** Path to SQLite database file for persistent indexing in Node/Bun. */
  sqlitePath?: LocalClientServicesParams['sqlitePath'];
};

/**
 * Create services from config.
 */
export const createClientServices = async (
  config: Config,
  options: CreateClientServicesOptions = {},
): Promise<ClientServicesProvider> => {
  const {
    createWorker,
    createDedicatedWorker,
    createCoordinatorWorker,
    singleClientMode,
    createOpfsWorker,
    observabilityGroup,
    signalTelemetryEnabled,
    sqlitePath,
  } = options;
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

  let useWorker = false;
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    const parser = new UAParser(navigator.userAgent);

    // TODO(wittjosiah): Ideally this should not need to do any user agent parsing.
    //  However, while SharedWorker is supported by iOS, it is not fully working and there's no way to inspect it.
    useWorker = typeof SharedWorker !== 'undefined' && parser.getOS().name !== 'iOS';
  }

  return createDedicatedWorker
    ? new DedicatedWorkerClientServices({
        createWorker: createDedicatedWorker,
        createCoordinator: () =>
          singleClientMode
            ? new SingleClientCoordinator()
            : createCoordinatorWorker
              ? new SharedWorkerCoordinator(createCoordinatorWorker)
              : new SharedWorkerCoordinator(),
        config,
      })
    : createWorker && useWorker
      ? fromWorker(config, { createWorker, observabilityGroup, signalTelemetryEnabled })
      : fromHost(
          config,
          {
            createOpfsWorker,
            sqlitePath,
          },
          observabilityGroup,
          signalTelemetryEnabled,
        );
};
