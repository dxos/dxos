//
// Copyright 2024 DXOS.org
//

import { FileCloud, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { Capabilities, Events, contributes, defineModule, definePlugin, oneOf } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';

import { Blockstore, FileUploader, Markdown, ReactSurface } from './capabilities';
import { meta, WNFS_PLUGIN } from './meta';
import translations from './translations';
import { FileType } from './types';

<<<<<<< HEAD
export const WnfsPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/blockstore`,
      activatesOn: ClientEvents.ClientReady,
      activate: Blockstore,
    }),
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/module/metadata`,
      activatesOn: oneOf(Events.Startup, Events.SetupAppGraph),
      activate: () =>
        contributes(Capabilities.Metadata, {
          id: FileType.typename,
          metadata: {
            placeholder: ['file title placeholder', { ns: WNFS_PLUGIN }],
            icon: (props: IconProps) => <FileCloud {...props} />,
          },
        }),
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupClient,
      activate: () => contributes(ClientCapabilities.SystemSchema, [FileType]),
    }),
    defineModule({
      id: `${meta.id}/module/file-uploader`,
      activatesOn: ClientEvents.ClientReady,
      activate: FileUploader,
    }),
    defineModule({
      id: `${meta.id}/module/markdown`,
      activatesOn: Events.Startup,
      activate: Markdown,
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.Startup,
      activate: ReactSurface,
    }),
  ]);
=======
export const WnfsPlugin = (): PluginDefinition<WnfsPluginProvides> => {
  let blockstore: Blockstore.MixedBlockstore | undefined;

  return {
    meta,
    ready: async (plugins) => {
      const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
      invariant(client);
      const apiHost = client?.config?.values?.runtime?.services?.edge?.url || 'http://localhost:8787';
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
          // NOT USED IN COMPOSER VIEW

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
>>>>>>> a8315dbb39 (feat: Track blocks that haven't been stored remotely yet)
