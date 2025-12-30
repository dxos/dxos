//
// Copyright 2022 DXOS.org
//

import UAParser from 'ua-parser-js';

import { type ClientServicesProvider } from '@dxos/client-protocol';
import { type Config } from '@dxos/config';

import { fromHost } from './local-client-services';
import { fromSocket } from './socket';
import { type WorkerClientServicesProps, fromWorker } from './worker-client-services';

/**
 * Create services from config.
 * @param config
 * @param createWorker
 * @param observabilityGroup - Optional observability group that will be sent with Signaling metadata.
 * @param signalTelemetryEnabled - Optional flag to enable telemetry metadata sent with Signaling requests.
 */
export const createClientServices = (
  config: Config,
  createWorker?: WorkerClientServicesProps['createWorker'],
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

  return createWorker && useWorker
    ? fromWorker(config, { createWorker, observabilityGroup, signalTelemetryEnabled })
    : fromHost(config, {}, observabilityGroup, signalTelemetryEnabled);
};
