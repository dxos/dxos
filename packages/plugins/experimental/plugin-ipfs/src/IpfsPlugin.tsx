//
// Copyright 2023 DXOS.org
//

import { FileCloud, type IconProps } from '@phosphor-icons/react';
import { create as createIpfsClient } from 'kubo-rpc-client';
import React, { type Ref } from 'react';
import urlJoin from 'url-join';

import { type Plugin, type PluginDefinition, isObject, resolvePlugin } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { type ClientPluginProvides, parseClientPlugin } from '@dxos/plugin-client';
import { isTileComponentProps } from '@dxos/react-ui-mosaic';

import { FileCard, FileMain, FileSection, FileSlide } from './components';
import meta, { IPFS_PLUGIN } from './meta';
import translations from './translations';
import { FileType } from './types';
import { type IpfsPluginProvides } from './types';

const DEFAULT_TIMEOUT = 30_000;

export const IpfsPlugin = (): PluginDefinition<IpfsPluginProvides> => {
  let clientPlugin: Plugin<ClientPluginProvides> | undefined;

  return {
    meta,
    ready: async (plugins) => {
      clientPlugin = resolvePlugin(plugins, parseClientPlugin);
    },
    provides: {
      translations,
      metadata: {
        records: {
          [FileType.typename]: {
            placeholder: ['file title placeholder', { ns: IPFS_PLUGIN }],
            icon: (props: IconProps) => <FileCloud {...props} />,
            iconSymbol: 'ph--file-cloud--regular',
          },
        },
      },
      echo: {
        schema: [FileType],
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
        component: ({ data, role, ...props }, forwardedRef) => {
          switch (role) {
            case 'main':
              return data.active instanceof FileType ? <FileMain file={data.active} /> : null;
            case 'slide':
              return data.slide instanceof FileType ? <FileSlide file={data.slide} cover={false} /> : null;
            case 'section':
              return data.object instanceof FileType ? <FileSection file={data.object} /> : null;
            case 'card': {
              if (
                isObject(data.content) &&
                typeof data.content.id === 'string' &&
                data.content.object instanceof FileType
              ) {
                const cardProps = { ...props, item: { id: data.content.id, object: data.content.object } };
                return isTileComponentProps(cardProps) ? (
                  <FileCard {...cardProps} ref={forwardedRef as Ref<HTMLDivElement>} />
                ) : null;
              }
              break;
            }
          }

          return null;
        },
      },
    },
  };
};