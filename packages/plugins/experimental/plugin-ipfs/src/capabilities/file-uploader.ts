//
// Copyright 2025 DXOS.org
//

import { create as createIpfsClient } from 'kubo-rpc-client';
import urlJoin from 'url-join';

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';

const DEFAULT_TIMEOUT = 30_000;

export default (context: PluginsContext) =>
  // TODO(burdon): Add intent to upload file.
  contributes(Capabilities.FileUploader, async (file, space) => {
    try {
      // TODO(burdon): Set via config or IPFS_API_SECRET in dev.
      const config = context.requestCapability(ClientCapabilities.Client).config;

      // TODO(nf): Dedupe with publish.ts in @dxos/cli.
      const server = config.values.runtime?.services?.ipfs?.server;
      const gateway = config.values.runtime?.services?.ipfs?.gateway;
      if (server) {
        let authorizationHeader;
        const serverAuthSecret = config?.get('runtime.services.ipfs.serverAuthSecret');
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

        const ipfsClient = createIpfsClient({
          url: server,
          timeout: DEFAULT_TIMEOUT,
          ...(authorizationHeader ? { headers: { authorization: authorizationHeader } } : {}),
        });

        const { cid, path } = await ipfsClient.add(file, { pin: true });
        const info = {
          url: gateway ? urlJoin(gateway, cid.toString()) : undefined,
          cid: cid.toString(),
        };

        log('upload', { file, info, path });
        return info;
      }
    } catch (err: any) {
      if (err.name === 'HTTPError' && err.response.status === 413) {
        throw new Error('File is too large.');
      }
      log.warn('IPFS upload failed', { err });
      throw new Error('Upload to IPFS failed.');
    }

    return undefined;
  });
