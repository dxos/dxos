//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { CreateObject, EdgeBackend, InlineBackend, OperationHandler, Schema, SkillDefinition } from '#capabilities';
import { meta } from '#meta';

export const FilePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(CreateObject),
  Plugin.addModule(EdgeBackend),
  Plugin.addModule(InlineBackend),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(Schema),
  Plugin.make,
);

export default FilePlugin;
