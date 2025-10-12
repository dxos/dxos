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
} from '@dxos/app-framework';
import { ClientEvents } from '@dxos/plugin-client';
import { MarkdownEvents } from '@dxos/plugin-markdown';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { defineObjectForm } from '@dxos/plugin-space/types';

import { Blockstore, FileUploader, IntentResolver, Markdown, ReactSurface, WnfsCapabilities } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { FileType, WnfsAction } from './types';

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
        id: FileType.typename,
        metadata: {
          label: (object: any) => (object instanceof FileType ? object.name : undefined),
          // TODO(wittjosiah): Would be nice if icon could change based on the type of the file.
          icon: 'ph--file--regular',
        },
      }),
  }),
  defineModule({
    id: `${meta.id}/module/object-form`,
    activatesOn: ClientEvents.SetupSchema,
    activate: () =>
      contributes(
        SpaceCapabilities.ObjectForm,
        defineObjectForm({
          objectSchema: FileType,
          formSchema: WnfsAction.UploadFileSchema,
          getIntent: (props, options) =>
            pipe(createIntent(WnfsAction.Upload, { ...props, space: options.space }), chain(WnfsAction.Create, {})),
        }),
      ),
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
