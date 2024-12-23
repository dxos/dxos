//
// Copyright 2023 DXOS.org
//

import { create as createIpfsClient } from 'kubo-rpc-client';
import React from 'react';
import urlJoin from 'url-join';

import { type Plugin, type PluginDefinition, createSurface, resolvePlugin } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { type ClientPluginProvides, parseClientPlugin } from '@dxos/plugin-client/types';

import { FileMain, FileSection, FileSlide } from './components';
import meta, { IPFS_PLUGIN } from './meta';
import translations from './translations';
import { FileType } from './types';
import { type IpfsPluginProvides } from './types';

const DEFAULT_TIMEOUT = 30_000;

export const IpfsPlugin = (): PluginDefinition<IpfsPluginProvides> => {
  let clientPlugin: Plugin<ClientPluginProvides> | undefined;

  return {
    meta,
    ready: async ({ plugins }) => {
      clientPlugin = resolvePlugin(plugins, parseClientPlugin);
    },
    provides: {
      translations,
      metadata: {
        records: {
          [FileType.typename]: {
            placeholder: ['file title placeholder', { ns: IPFS_PLUGIN }],
            icon: 'ph--file-cloud--regular',
          },
        },
      },
      echo: {
        system: [FileType],
      },
      // TODO(burdon): Add intent to upload file.
      file: {
        upload: async (file, space) => {
          try {
            // TODO(burdon): Set via config or IPFS_API_SECRET in dev.
            const config = clientPlugin?.provides.client.config;

            // TODO(nf): Dedupe with publish.ts in @dxos/cli.
            const server = config?.values.runtime?.services?.ipfs?.server;
            const gateway = config?.values.runtime?.services?.ipfs?.gateway;
            if (server) {
              let authorizationHeader;
              const serverAuthSecret = config?.get('runtime.services.ipfs.serverAuthSecret');
              if (serverAuthSecret) {
                const splitSecret = serverAuthSecret.split(':');
                switch (splitSecret[0]) {
                  case 'basic':
                    authorizationHeader =
                      'Basic ' + Buffer.from(splitSecret[1] + ':' + splitSecret[2]).toString('base64');
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
        },
      },
      surface: {
        definitions: () => [
          createSurface({
            id: `${IPFS_PLUGIN}/article`,
            role: 'article',
            filter: (data): data is { subject: FileType } => data.subject instanceof FileType,
            component: ({ data }) => <FileMain file={data.subject} />,
          }),
          createSurface({
            id: `${IPFS_PLUGIN}/section`,
            role: 'section',
            filter: (data): data is { subject: FileType } => data.subject instanceof FileType,
            component: ({ data }) => <FileSection file={data.subject} />,
          }),
          createSurface({
            id: `${IPFS_PLUGIN}/slide`,
            role: 'slide',
            filter: (data): data is { subject: FileType } => data.subject instanceof FileType,
            component: ({ data }) => <FileSlide file={data.subject} cover={false} />,
          }),
        ],
      },
    },
  };
};
