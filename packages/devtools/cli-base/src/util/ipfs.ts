//
// Copyright 2024 DXOS.org
//

import { type Config } from '@dxos/config';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

// eslint-disable-next-line @typescript-eslint/no-implied-eval
export const importESM = new Function('modulePath', 'return import(modulePath)');

// TODO(nf): make CLI support dx-env.yml
export const createIpfsClient = async (config: Config, timeout?: string | number) => {
  const { create } = await importESM('kubo-rpc-client');

  const serverAuthSecret = process.env.IPFS_API_SECRET ?? config?.get('runtime.services.ipfs.serverAuthSecret');
  let authorizationHeader;
  if (serverAuthSecret) {
    const splitSecret = serverAuthSecret.split(':');
    switch (splitSecret[0]) {
      case 'basic':
        authorizationHeader = 'Basic ' + Buffer.from(splitSecret[1] + ':' + splitSecret[2]).toString('base64');
        break;
      case 'bearer':
        authorizationHeader = 'Bearer ' + splitSecret[1];
        break;
      default:
        throw new Error(`Unsupported authType: ${splitSecret[0]}`);
    }
  }

  const server = config?.get('runtime.services.ipfs.server');
  invariant(server, 'Missing IPFS Server.');
  log('connecting to IPFS server', { server });
  return create({
    url: server,
    timeout: timeout || '1m',
    ...(authorizationHeader ? { headers: { authorization: authorizationHeader } } : {}),
  });
};
