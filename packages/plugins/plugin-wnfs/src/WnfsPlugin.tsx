//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { ClientEvents } from '@dxos/plugin-client';
import { MarkdownEvents } from '@dxos/plugin-markdown';
import { type CreateObject } from '@dxos/plugin-space/types';
import { SpaceOperation } from '@dxos/plugin-space/operations';

import { Blockstore, FileUploader, Markdown, OperationHandler, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { WnfsAction, WnfsCapabilities, WnfsFile } from './types';
import { WnfsOperation } from './operations';

export const WnfsPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: {
      id: WnfsFile.File.typename,
      metadata: {
        // TODO(wittjosiah): Would be nice if icon could change based on the type of the file.
        icon: Annotation.IconAnnotation.get(WnfsFile.File).pipe(Option.getOrThrow).icon,
        iconHue: Annotation.IconAnnotation.get(WnfsFile.File).pipe(Option.getOrThrow).hue ?? 'white',
        inputSchema: WnfsAction.UploadFileSchema,
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const { object } = yield* Operation.invoke(WnfsOperation.CreateFile, { ...props, db: options.db });
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
          })) satisfies CreateObject,
      },
    },
  }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
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
