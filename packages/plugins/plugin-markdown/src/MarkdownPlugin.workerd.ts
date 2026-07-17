//
// Copyright 2026 DXOS.org
//

import { Capabilities, Plugin } from '@dxos/app-framework';
import { AppCapabilities, AppPlugin } from '@dxos/app-toolkit';
import { Text } from '@dxos/schema';

import { meta } from '#meta';
import { Markdown } from '#types';

import OperationHandler from './capabilities/operation-handler';
import SkillDefinition from './capabilities/skill-definition';

export const MarkdownPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSkillDefinitionModule({
    id: 'skill-definition',
    requires: [],
    provides: [AppCapabilities.SkillDefinition],
    activate: SkillDefinition,
  }),
  AppPlugin.addOperationHandlerModule({
    id: 'operation-handler',
    requires: [],
    provides: [Capabilities.OperationHandler],
    activate: OperationHandler,
  }),
  AppPlugin.addSchemaModule({ schema: [Markdown.Document, Text.Text] }),
  Plugin.make,
);

export default MarkdownPlugin;
