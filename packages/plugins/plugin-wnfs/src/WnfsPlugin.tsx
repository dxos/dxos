//
// Copyright 2024 DXOS.org
//

import * as Function from 'effect/Function';

import {
  Capabilities,
  Events,
  chain,
  contributes,
  createIntent,
  defineModule,
  definePlugin,
} from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { MarkdownEvents } from '@dxos/plugin-markdown';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';

import { Blockstore, FileUploader, IntentResolver, Markdown, ReactSurface, WnfsCapabilities } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { WnfsAction, WnfsFile } from './types';

export const WnfsPlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/blockstore`,
    activatesOn: ClientEvents.ClientReady,
    activate: Blockstore,
  }),
  defineModule({
    id: `${meta.id}/module/instances`,
    activatesOn: ClientEvents.ClientReady,
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
    activatesOn: Events.SetupMetadata,
    activate: () =>
      contributes(Capabilities.Metadata, {
        id: WnfsFile.File.typename,
        metadata: {
          // TODO(wittjosiah): Would be nice if icon could change based on the type of the file.
          icon: 'ph--file--regular',
          iconHue: 'teal',
          inputSchema: WnfsAction.UploadFileSchema,
          createObjectIntent: ((props, options) =>
            Function.pipe(
              createIntent(WnfsAction.Upload, { ...props, space: options.space }),
              chain(WnfsAction.Create, {}),
            )) satisfies CreateObjectIntent,
          addToCollectionOnCreate: true,
        },
      }),
  }),
  defineModule({
    id: `${meta.id}/module/schema`,
    activatesOn: ClientEvents.SetupSchema,
    activate: () => contributes(ClientCapabilities.Schema, [WnfsFile.File]),
  }),
  defineModule({
    id: `${meta.id}/module/file-uploader`,
    activatesOn: ClientEvents.ClientReady,
    activate: FileUploader,
  }),
  defineModule({
    id: `${meta.id}/module/markdown`,
    activatesOn: MarkdownEvents.SetupExtensions,
    activate: Markdown,
  }),
  defineModule({
    id: `${meta.id}/module/react-surface`,
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  defineModule({
    id: `${meta.id}/module/intent-resolver`,
    activatesOn: Events.SetupIntentResolver,
    activate: IntentResolver,
  }),
]);
