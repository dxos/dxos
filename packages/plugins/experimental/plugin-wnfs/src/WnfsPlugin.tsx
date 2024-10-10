//
// Copyright 2024 DXOS.org
//

import { FileCloud, type IconProps } from '@phosphor-icons/react';
import { CID } from 'multiformats';
import React, { type Ref } from 'react';

import { type PluginDefinition, isObject } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { type DocumentType } from '@dxos/plugin-markdown/types';
import { type Space, getSpace } from '@dxos/react-client/echo';
import { isTileComponentProps } from '@dxos/react-ui-mosaic';

import * as Blockstore from './blockstore';
import { Rng, filePath, store } from './common';
import { FileCard, FileMain, FileSection, FileSlide } from './components';
import { image as imageExtension } from './extensions';
import { loadWnfs } from './load';
import meta, { WNFS_PLUGIN } from './meta';
import translations from './translations';
import { FileType } from './types';
import { type WnfsPluginProvides } from './types';
import { wnfsUrl } from './wnfs-url';

export const WnfsPlugin = (): PluginDefinition<WnfsPluginProvides> => {
  const blockstore = Blockstore.create();

  return {
    meta,
    ready: async (plugins) => {
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
          const { directory, forest } = await loadWnfs(blockstore, space);
          const wnfsStore = store(blockstore);
          const path = filePath(file.name, space);

          const result = await directory.write(
            path,
            true,
            new Uint8Array(await file.arrayBuffer()),
            new Date(),
            forest,
            wnfsStore,
            new Rng(),
          );

          const [_, updatedForest] = await result.rootDir.store(result.forest, wnfsStore, new Rng());

          const cidBytes = await updatedForest.store(wnfsStore);

          space.properties.wnfs_private_forest_cid = CID.decode(cidBytes).toString();

          const info = {
            url: wnfsUrl(path),
          };

          log('upload', { file, info });
          return info;
        },
      },
      markdown: {
        extensions: ({ document }: { document?: DocumentType }) => {
          if (document) {
            const space = getSpace(document);
            return space ? [imageExtension({ blockstore, space })] : [];
          }

          return [];
        },
      },
      surface: {
        component: ({ data, role, ...props }, forwardedRef) => {
          // TODO?
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
