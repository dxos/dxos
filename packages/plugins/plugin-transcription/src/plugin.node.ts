//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { OperationHandler, SkillDefinition, TextContent } from '#capabilities';
import { meta } from '#meta';

export const TranscriptionPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(TextContent),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema(() => import('./schema'))),
  Plugin.make,
);

export default TranscriptionPlugin;
