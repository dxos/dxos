//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, contributes, defineModule, definePlugin, oneOf } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';

import { FileUploader, ReactSurface } from './capabilities';
import { IPFS_PLUGIN, meta } from './meta';
import translations from './translations';
import { FileType } from './types';

export const IpfsPlugin = () =>
  definePlugin(meta, [
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
            placeholder: ['file title placeholder', { ns: IPFS_PLUGIN }],
            icon: 'ph--file-cloud--regular',
          },
        }),
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupClient,
      activate: () => contributes(ClientCapabilities.Schema, [FileType]),
    }),
    defineModule({
      id: `${meta.id}/module/file-uploader`,
      activatesOn: ClientEvents.ClientReady,
      activate: FileUploader,
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.Startup,
      activate: ReactSurface,
    }),
  ]);
