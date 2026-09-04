//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { Connector, OperationHandler, SkillDefinition } from '#capabilities';
import { meta } from '#meta';

export const DeepSeekPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(Connector),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(SkillDefinition),
  Plugin.make,
);

export default DeepSeekPlugin;
