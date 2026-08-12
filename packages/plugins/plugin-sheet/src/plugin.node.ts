//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { CommentConfig, CreateObject, OperationHandler, SkillDefinition, UndoMappings } from '#capabilities';
import { meta } from '#meta';
import { Sheet } from '#types';

export const SheetPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(CommentConfig),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(UndoMappings),
  Plugin.addModule(AppCapability.schema([Sheet.Sheet])),
  Plugin.make,
);

export default SheetPlugin;
