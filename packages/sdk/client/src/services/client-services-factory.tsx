//
// Copyright 2022 DXOS.org
//

import { type ClientServicesProvider } from '@dxos/client-protocol';
import { type Config, type ConfigProto } from '@dxos/config';
import { log } from '@dxos/log';

import { fromSocket } from './socket';
import { fromHost, fromIFrame } from './utils';

export const Remote = (target: string | undefined): Partial<ConfigProto> => {
  if (!target) {
    return {};
  }

  try {
    const url = new URL(target);
    const protocol = url.protocol.slice(0, -1);

    return {
      runtime: {
        client: {
          // TODO(burdon): Remove vault.html.
          remoteSource: url.origin + (protocol.startsWith('http') ? '/vault.html' : ''),
        },
      },
    };
  } catch (err) {
    log.catch(err);
    return {};
  }
};

/**
 * Create services from config.
 */
export const createClientServices = async (config: Config): Promise<ClientServicesProvider> => {
  const remote = config.values.runtime?.client?.remoteSource;

  if (remote) {
    const url = new URL(remote);
    const protocol = url.protocol.slice(0, -1);
    switch (protocol) {
      case 'ws':
      case 'wss': {
        return await fromSocket(remote);
      }

      case 'http':
      case 'https': {
        return await fromIFrame(config);
      }
    }
  }

  return await fromHost(config);
};
