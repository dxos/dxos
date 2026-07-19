//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { Script } from '@dxos/compute';

import { AppGraphBuilder, CreateObject, OperationHandler, SkillDefinition } from '#capabilities';
import { meta } from '#meta';

export const ScriptPlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(AppGraphBuilder),
  Plugin.addLazyModule(SkillDefinition),
  Plugin.addLazyModule(CreateObject),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(AppCapability.schema([Script.Script])),
  Plugin.make,
);

export default ScriptPlugin;
