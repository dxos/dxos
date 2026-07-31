//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { Transcript } from '@dxos/types';

import { OperationHandler, SkillDefinition, TextContent } from '#capabilities';
import { meta } from '#meta';

export const TranscriptionPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(TextContent),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema([Transcript.Transcript])),
  Plugin.make,
);

export default TranscriptionPlugin;
