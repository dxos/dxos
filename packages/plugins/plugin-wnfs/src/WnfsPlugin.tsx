//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';
import { ClientEvents } from '@dxos/plugin-client';
import { MarkdownEvents } from '@dxos/plugin-markdown';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';
import { type CreateObject } from '@dxos/plugin-space/types';

import { Blockstore, FileUploader, Markdown, OperationResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { WnfsAction, WnfsCapabilities, WnfsFile, WnfsOperation } from './types';

export const WnfsPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: {
      id: WnfsFile.File.typename,
      metadata: {
        // TODO(wittjosiah): Would be nice if icon could change based on the type of the file.
        icon: 'ph--file--regular',
        iconHue: 'teal',
        inputSchema: WnfsAction.UploadFileSchema,
        createObject: ((props, { db }) =>
          Effect.gen(function* () {
            const { object } = yield* Operation.invoke(WnfsOperation.CreateFile, { ...props, db });
            return object;
          })) satisfies CreateObject,
      },
    },
  }),
  AppPlugin.addOperationResolverModule({ activate: OperationResolver }),
  AppPlugin.addSchemaModule({ schema: [WnfsFile.File] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'blockstore',
    activatesOn: ClientEvents.ClientReady,
    activate: Blockstore,
  }),
  Plugin.addModule({
    id: 'instances',
    activatesOn: ClientEvents.ClientReady,
    activate: () =>
      Effect.sync(() => {
        const instances: WnfsCapabilities.Instances = {};
        return Capability.contributes(WnfsCapabilities.Instances, instances);
      }),
  }),
  Plugin.addModule({
    id: 'on-space-created',
    activatesOn: SpaceEvents.SpaceCreated,
    activate: () =>
      Effect.succeed(
        Capability.contributes(SpaceCapabilities.OnCreateSpace, (params) =>
          Operation.invoke(WnfsOperation.OnCreateSpace, params),
        ),
      ),
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
  Plugin.make,
);
