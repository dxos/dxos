//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { OperationHandler, SkillDefinition, Toolkit } from '#capabilities';
import { meta } from '#meta';

export const AssistantPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(Toolkit),
  Plugin.addModule(AppCapability.schema(() => import('./schema-defs'))),
  Plugin.make,
);

export default AssistantPlugin;
