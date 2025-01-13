//
// Copyright 2024 DXOS.org
//

import { FileCloud, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { Capabilities, Events, contributes, defineModule, definePlugin } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';

import { Blockstore, FileUploader, Markdown, ReactSurface } from './capabilities';
import { meta, WNFS_PLUGIN } from './meta';
import translations from './translations';
import { FileType } from './types';

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
      activatesOn: Events.Startup,
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
