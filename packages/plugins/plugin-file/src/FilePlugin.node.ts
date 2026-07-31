//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Blob } from '@dxos/echo';

import { CreateObject, EdgeBackend, InlineBackend, OperationHandler, SkillDefinition } from '#capabilities';
import { meta } from '#meta';
import { File } from '#types';

export const FilePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(CreateObject),
  Plugin.addModule(EdgeBackend),
  Plugin.addModule(InlineBackend),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(AppCapability.schema([File.File, Blob.Blob])),
  Plugin.make,
);

export default FilePlugin;
