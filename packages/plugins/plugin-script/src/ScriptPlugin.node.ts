//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { Script } from '@dxos/compute';

import { AppGraphBuilder, CreateObject, OperationHandler, SkillDefinition } from '#capabilities';
import { meta } from '#meta';

export const ScriptPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema([Script.Script])),
  Plugin.make,
);

export default ScriptPlugin;
