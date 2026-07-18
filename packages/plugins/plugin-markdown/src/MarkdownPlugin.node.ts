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
  Plugin.addLazyModule(SkillDefinition),
  Plugin.addLazyModule(CreateObject),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(AppCapability.schema([Markdown.Document, Text.Text])),
  Plugin.make,
);

export default MarkdownPlugin;
