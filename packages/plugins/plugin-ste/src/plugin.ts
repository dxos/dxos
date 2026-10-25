//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { OperationHandler, SkillDefinition } from '#capabilities';
import { meta } from '#meta';

export const StePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(OperationHandler),
  Plugin.addModule(SkillDefinition),
  Plugin.make,
);

export default StePlugin;
