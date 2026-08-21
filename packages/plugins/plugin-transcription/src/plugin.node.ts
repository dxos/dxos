//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { OperationHandler, Schema, SkillDefinition, TextContent } from '#capabilities';
import { meta } from '#meta';

export const TranscriptionPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(TextContent),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(Schema),
  Plugin.make,
);

export default TranscriptionPlugin;
