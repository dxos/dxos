//
// Copyright 2024 DXOS.org
//

import * as Function from 'effect/Function';

import {
  Capabilities,
  Events,
  Plugin,
  Capability,
  chain,
  createIntent,
} from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { MarkdownEvents } from '@dxos/plugin-markdown';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';

import { Blockstore, FileUploader, IntentResolver, Markdown, ReactSurface, WnfsCapabilities } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { WnfsAction, WnfsFile } from './types';

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
  Plugin.addModule({
    id: 'translations',
    activatesOn: Events.SetupTranslations,
    activate: () => Capability.contributes(Capabilities.Translations, translations),
  }),
  Plugin.addModule({
    id: 'metadata',
    activatesOn: Events.SetupMetadata,
    activate: () =>
      Capability.contributes(Capabilities.Metadata, {
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
      }),
  }),
  Plugin.addModule({
    id: 'schema',
    activatesOn: ClientEvents.SetupSchema,
    activate: () => Capability.contributes(ClientCapabilities.Schema, [WnfsFile.File]),
  }),
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
  Plugin.addModule({
    id: 'react-surface',
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  Plugin.addModule({
    id: 'intent-resolver',
    activatesOn: Events.SetupIntentResolver,
    activate: IntentResolver,
  }),
  Plugin.make,
);
