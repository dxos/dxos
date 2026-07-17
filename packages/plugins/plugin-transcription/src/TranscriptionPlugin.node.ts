//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Transcript } from '@dxos/types';

import { OperationHandler, SkillDefinition, TextContent } from '#capabilities';
import { meta } from '#meta';

export const TranscriptionPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSkillDefinitionModule({
    requires: SkillDefinition.requires,
    provides: SkillDefinition.provides,
    activate: SkillDefinition,
  }),
  AppPlugin.addTextContentModule({
    requires: TextContent.requires,
    provides: TextContent.provides,
    activate: TextContent,
  }),
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addSchemaModule({ schema: [Transcript.Transcript] }),
  Plugin.make,
);

export default TranscriptionPlugin;
