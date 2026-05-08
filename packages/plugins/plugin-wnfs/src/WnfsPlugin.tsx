//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { ClientEvents } from '@dxos/plugin-client/types';
import { MarkdownEvents } from '@dxos/plugin-markdown/types';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { SpaceCapabilities, type CreateObject } from '@dxos/plugin-space/types';

import { Blockstore, FileUploader, Markdown, OperationHandler, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { WnfsOperation } from '#operations';
import { translations } from '#translations';
import { WnfsAction, WnfsCapabilities, WnfsFile } from '#types';

export const WnfsPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'create-object',
    activatesOn: AppActivationEvents.SetupMetadata,
    activate: Effect.fnUntraced(function* () {
      return Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: WnfsFile.File.typename,
        inputSchema: WnfsAction.UploadFileSchema,
        // TODO(wittjosiah): Would be nice if icon could change based on the type of the file.
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
      });
    }),
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

export default WnfsPlugin;
