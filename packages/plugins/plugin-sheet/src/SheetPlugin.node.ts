//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppCapabilities, AppPlugin } from '@dxos/app-toolkit';

import { OperationHandler, UndoMappings } from '#capabilities';
import { meta } from '#meta';
import { Sheet } from '#types';

export const SheetPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'comment-config',
    activatesOn: AppActivationEvents.SetupMetadata,
    activate: Effect.fnUntraced(function* () {
      return Capability.contributes(AppCapabilities.CommentConfig, {
        id: Sheet.Sheet.typename,
        comments: 'anchored',
      } satisfies AppCapabilities.CommentConfig);
    }),
  }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addUndoMappingsModule({ activate: UndoMappings }),
  AppPlugin.addSchemaModule({ schema: [Sheet.Sheet] }),
  Plugin.make,
);

export default SheetPlugin;
