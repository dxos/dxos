//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { OperationHandler, Schema, SkillDefinition, Toolkit } from '#capabilities';
import { meta } from '#meta';

export const AssistantPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(Toolkit),
  Plugin.addModule(Schema),
  Plugin.make,
);

export default AssistantPlugin;
