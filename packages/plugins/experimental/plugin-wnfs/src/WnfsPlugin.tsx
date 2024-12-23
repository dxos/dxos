//
// Copyright 2024 DXOS.org
//

import { FileCloud, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { type PluginDefinition, createSurface, resolvePlugin } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { parseClientPlugin } from '@dxos/plugin-client/types';
import { type DocumentType } from '@dxos/plugin-markdown/types';
import { type Space, getSpace } from '@dxos/react-client/echo';

import * as Blockstore from './blockstore';
import { FileMain, FileSection, FileSlide } from './components';
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
    ready: async ({ plugins }) => {
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
        system: [FileType],
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
        definitions: () => [
          createSurface({
            id: `${WNFS_PLUGIN}/article`,
            role: 'article',
            filter: (data): data is { subject: FileType } => data.subject instanceof FileType,
            component: ({ data }) => <FileMain file={data.subject} />,
          }),
          createSurface({
            id: `${WNFS_PLUGIN}/section`,
            role: 'section',
            filter: (data): data is { subject: FileType } => data.subject instanceof FileType,
            component: ({ data }) => <FileSection file={data.subject} />,
          }),
          createSurface({
            id: `${WNFS_PLUGIN}/slide`,
            role: 'slide',
            filter: (data): data is { subject: FileType } => data.subject instanceof FileType,
            component: ({ data }) => <FileSlide file={data.subject} cover={false} />,
          }),
        ],
      },
    },
  };
};
