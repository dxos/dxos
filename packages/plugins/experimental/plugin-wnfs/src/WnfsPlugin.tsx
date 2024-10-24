//
// Copyright 2024 DXOS.org
//

import { FileCloud, type IconProps } from '@phosphor-icons/react';
import React, { type Ref } from 'react';

import { type PluginDefinition, isObject, resolvePlugin } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { parseClientPlugin } from '@dxos/plugin-client';
import { type DocumentType } from '@dxos/plugin-markdown/types';
import { type Space, getSpace } from '@dxos/react-client/echo';
import { isTileComponentProps } from '@dxos/react-ui-mosaic';

import * as Blockstore from './blockstore';
import { FileCard, FileMain, FileSection, FileSlide } from './components';
import { image as imageExtension } from './extensions';
import meta, { WNFS_PLUGIN } from './meta';
import translations from './translations';
import { FileType } from './types';
import { type WnfsPluginProvides } from './types';
import { upload } from './upload';

export const WnfsPlugin = (): PluginDefinition<WnfsPluginProvides> => {
  let blockstore: Blockstore.MixedBlockstore | undefined;

  return {
    meta,
    ready: async (plugins) => {
      const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
      invariant(client);
      const apiHost = client.config.values.runtime?.services?.edge?.url || 'http://localhost:8787';
      blockstore = Blockstore.create(apiHost);
      await blockstore.open();
    },
    provides: {
      translations,
      metadata: {
        records: {
          [FileType.typename]: {
            placeholder: ['file title placeholder', { ns: WNFS_PLUGIN }],
            icon: (props: IconProps) => <FileCloud {...props} />,
          },
        },
      },
      echo: {
        schema: [FileType],
      },
      // TODO(burdon): Add intent to upload file.
      file: {
        upload: async (file: File, space: Space) => {
          if (!blockstore) {
            throw new Error('Blockstore is not ready yet');
          }

          return await upload({ blockstore, file, space });
        },
      },
      markdown: {
        extensions: ({ document }: { document?: DocumentType }) => {
          if (!blockstore) {
            throw new Error('Blockstore is not ready yet');
          }

          if (document) {
            const space = getSpace(document);
            return space ? [imageExtension({ blockstore, space })] : [];
          }

          return [];
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
