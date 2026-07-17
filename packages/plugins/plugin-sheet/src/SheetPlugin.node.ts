//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { CommentConfig, CreateObject, OperationHandler, UndoMappings } from '#capabilities';
import { meta } from '#meta';
import { Sheet } from '#types';

export const SheetPlugin = Plugin.define(meta).pipe(
  AppPlugin.addCommentConfigModule({
    requires: CommentConfig.requires,
    provides: CommentConfig.provides,
    activate: CommentConfig,
  }),
  AppPlugin.addCreateObjectModule({
    requires: CreateObject.requires,
    provides: CreateObject.provides,
    activate: CreateObject,
  }),
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addUndoMappingsModule({
    requires: UndoMappings.requires,
    provides: UndoMappings.provides,
    activate: UndoMappings,
  }),
  AppPlugin.addSchemaModule({ schema: [Sheet.Sheet] }),
  Plugin.make,
);

export default SheetPlugin;
