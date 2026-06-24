//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Text } from '@dxos/schema';

import OperationHandler from './capabilities/operation-handler';
import SkillDefinition from './capabilities/skill-definition';
import { meta } from '#meta';
import { Markdown } from '#types';

export const MarkdownPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSkillDefinitionModule({ id: 'skill-definition', activate: SkillDefinition }),
  AppPlugin.addOperationHandlerModule({ id: 'operation-handler', activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Markdown.Document, Text.Text] }),
  Plugin.make,
);

export default MarkdownPlugin;
