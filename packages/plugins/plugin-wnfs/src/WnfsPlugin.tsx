//
// Copyright 2024 DXOS.org
//

import { pipe } from 'effect';

import {
  Capabilities,
  Events,
  chain,
  contributes,
  createIntent,
  defineModule,
  definePlugin,
  oneOf,
} from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { type Space } from '@dxos/react-client/echo';

import { Blockstore, FileUploader, IntentResolver, Markdown, ReactSurface, WnfsCapabilities } from './capabilities';
import { meta, WNFS_PLUGIN } from './meta';
import translations from './translations';
import { FileType, WnfsAction } from './types';

export const WnfsPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/blockstore`,
      activatesOn: ClientEvents.ClientReady,
      activate: Blockstore,
    }),
    defineModule({
      id: `${meta.id}/module/instances`,
      activatesOn: Events.Startup,
      activate: () => {
        const instances: WnfsCapabilities.Instances = {};
        return contributes(WnfsCapabilities.Instances, instances);
      },
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
            creationSchema: WnfsAction.UploadFileSchema,
            createObject: ({ file }: WnfsAction.UploadFileForm, { space }: { space: Space }) =>
              pipe(createIntent(WnfsAction.Upload, { file, space }), chain(WnfsAction.Create, {})),
            label: (object: any) => (object instanceof FileType ? object.name : undefined),
            placeholder: ['file title placeholder', { ns: WNFS_PLUGIN }],
            // TODO(wittjosiah): Would be nice if icon could change based on the type of the file.
            icon: 'ph--file--regular',
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
      id: `${meta.id}/module/markdown`,
      activatesOn: Events.Startup,
      activate: Markdown,
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.Startup,
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntents,
      activate: IntentResolver,
    }),
  ]);
