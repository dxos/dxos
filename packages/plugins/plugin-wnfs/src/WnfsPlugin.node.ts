//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { SpaceCapabilities, type CreateObject } from '@dxos/plugin-space/types';

import { OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { WnfsOperation } from '#operations';
import { WnfsAction, WnfsFile } from '#types';

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
  Plugin.make,
);

export default WnfsPlugin;
