//
// Copyright 2022 DXOS.org
//

import { type ClientServicesProvider } from '@dxos/client-protocol';
import { type Config } from '@dxos/config';
import { log } from '@dxos/log';

import { fromHost } from './local-client-services';
import { fromSocket } from './socket';
import { fromIFrame } from './utils';
import { type WorkerClientServicesParams, fromWorker } from './worker-client-services';

/**
 * Create services from config.
 * @param config
 * @param createWorker
 * @param observabilityGroup - Optional observability group that will be sent with Signaling metadata.
 * @param signalTelemetryEnabled - Optional flag to enable telemetry metadata sent with Signaling requests.
 */
export const createClientServices = (
  config: Config,
  createWorker?: WorkerClientServicesParams['createWorker'],
  observabilityGroup?: string,
  signalTelemetryEnabled?: boolean,
): Promise<ClientServicesProvider> => {
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
        log.warn('IFrame services deprecated.');
        return fromIFrame(config);
      }
    }
  }

  return createWorker && typeof SharedWorker !== 'undefined'
    ? fromWorker(config, { createWorker, observabilityGroup, signalTelemetryEnabled })
    : fromHost(config, {}, observabilityGroup, signalTelemetryEnabled);
};
