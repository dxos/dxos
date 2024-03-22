//
// Copyright 2023 DXOS.org
//

import { FileCloud, type IconProps } from '@phosphor-icons/react';
import { create as createIpfsClient } from 'kubo-rpc-client';
import React, { type Ref } from 'react';
import urljoin from 'url-join';

import { type ClientPluginProvides, parseClientPlugin } from '@braneframe/plugin-client';
import { File } from '@braneframe/types';
import { type Plugin, type PluginDefinition, isObject, resolvePlugin } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { isTileComponentProps } from '@dxos/react-ui-mosaic';

import { FileCard, FileMain, FileSection, FileSlide } from './components';
import meta, { IPFS_PLUGIN } from './meta';
import translations from './translations';
import { type IpfsPluginProvides, isFile } from './types';

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
          [File.schema.typename]: {
            placeholder: ['file title placeholder', { ns: IPFS_PLUGIN }],
            icon: (props: IconProps) => <FileCloud {...props} />,
          },
        },
      },
      // TODO(burdon): Add intent to upload file.
      file: {
        upload: async (file) => {
          try {
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
                url: gateway ? urljoin(gateway, cid.toString()) : undefined,
                cid: cid.toString(),
              };

              log('upload', { file, info, path });
              return info;
            }
          } catch (err) {
            log.catch(err);
          }

          return undefined;
        },
      },
      surface: {
        component: ({ data, role, ...props }, forwardedRef) => {
          switch (role) {
            case 'main':
              return isFile(data.active) ? <FileMain file={data.active} /> : null;
            case 'slide':
              return isFile(data.slide) ? <FileSlide file={data.slide} cover={false} /> : null;
            case 'section':
              return isFile(data.object) ? <FileSection file={data.object} /> : null;
            case 'card': {
              if (isObject(data.content) && typeof data.content.id === 'string' && isFile(data.content.object)) {
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
