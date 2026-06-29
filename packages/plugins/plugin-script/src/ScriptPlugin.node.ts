//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Script } from '@dxos/compute';

import { AppGraphBuilder, CreateObject, OperationHandler, SkillDefinition } from '#capabilities';
import { meta } from '#meta';

export const ScriptPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addSkillDefinitionModule({ activate: SkillDefinition }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Script.Script] }),
  Plugin.make,
);

export default ScriptPlugin;
