//
// Copyright 2022 DXOS.org
//

import { Config, Defaults, Dynamics } from '@dxos/config';

import { Client } from '../client';
import { fromSocket } from './socket';
import { fromHost, fromIFrame } from './utils';

/**
 * Create client from target URL.
 */
export const createClient = async (target: string): Promise<Client> => {
  const url = new URL(target);
  const protocol = url.protocol.slice(0, -1);
  console.log(target, protocol);
  switch (protocol) {
    case 'http':
    case 'https': {
      const config = new Config(
        {
          runtime: {
            client: {
              remoteSource: target + '/vault.html',
            },
          },
        },
        await Dynamics(),
        Defaults(),
      );
      const services = await fromIFrame(config);
      const client = new Client({ config, services });
      await client.initialize();
      return client;
    }

    case 'ws':
    case 'wss': {
      const config = new Config();
      const services = fromSocket(target);
      const client = new Client({ config, services });
      await client.initialize();
      return client;
    }

    default: {
      const config = new Config();
      const services = await fromHost(config);
      const client = new Client({ config, services });
      await client.initialize();
      return client;
    }
  }
};
