//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { CommentConfig, CreateObject, OperationHandler, SkillDefinition } from '#capabilities';
import { meta } from '#meta';

export const TablePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(CommentConfig),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema(() => import('./schema'))),
  Plugin.make,
);

export default TablePlugin;
