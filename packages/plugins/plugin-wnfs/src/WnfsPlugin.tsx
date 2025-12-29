//
// Copyright 2024 DXOS.org
//

import * as Function from 'effect/Function';

import { Capability, Common, Plugin, chain, createIntent } from '@dxos/app-framework';
import { ClientEvents } from '@dxos/plugin-client';
import { MarkdownEvents } from '@dxos/plugin-markdown';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';

import { Blockstore, FileUploader, IntentResolver, Markdown, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { WnfsAction, WnfsCapabilities, WnfsFile } from './types';

export const WnfsPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'blockstore',
    activatesOn: ClientEvents.ClientReady,
    activate: Blockstore,
  }),
  Plugin.addModule({
    id: 'instances',
    activatesOn: ClientEvents.ClientReady,
    activate: () => {
      const instances: WnfsCapabilities.Instances = {};
      return Capability.contributes(WnfsCapabilities.Instances, instances);
    },
  }),
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addMetadataModule({
    metadata: {
      id: WnfsFile.File.typename,
      metadata: {
        // TODO(wittjosiah): Would be nice if icon could change based on the type of the file.
        icon: 'ph--file--regular',
        iconHue: 'teal',
        inputSchema: WnfsAction.UploadFileSchema,
        createObjectIntent: ((props, options) =>
          Function.pipe(
            createIntent(WnfsAction.Upload, { ...props, db: options.db }),
            chain(WnfsAction.Create, {}),
          )) satisfies CreateObjectIntent,
        addToCollectionOnCreate: true,
      },
    },
  }),
  Common.Plugin.addSchemaModule({ schema: [WnfsFile.File] }),
  Plugin.addModule({
    id: 'file-uploader',
    activatesOn: ClientEvents.ClientReady,
    activate: FileUploader,
  }),
  Plugin.addModule({
    id: 'markdown',
    activatesOn: MarkdownEvents.SetupExtensions,
    activate: Markdown,
  }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Plugin.make,
);
