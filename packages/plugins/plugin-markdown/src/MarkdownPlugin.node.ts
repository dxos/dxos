//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { Text } from '@dxos/schema';

import { CreateObject, OperationHandler, SkillDefinition } from '#capabilities';
import { meta } from '#meta';
import { Markdown } from '#types';

export const MarkdownPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema([Markdown.Document, Text.Text])),
  Plugin.make,
);

export default MarkdownPlugin;
