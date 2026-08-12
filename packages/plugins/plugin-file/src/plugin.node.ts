//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { CreateObject, EdgeBackend, InlineBackend, OperationHandler, SkillDefinition } from '#capabilities';
import { meta } from '#meta';

export const FilePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(CreateObject),
  Plugin.addModule(EdgeBackend),
  Plugin.addModule(InlineBackend),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(AppCapability.schema(() => import('./schema'))),
  Plugin.make,
);

export default FilePlugin;
