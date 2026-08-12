//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Text } from '@dxos/schema';

import { meta } from '#meta';
import { Markdown } from '#types';

export const MarkdownPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppCapability.skillDefinition(() => import('./capabilities/skill-definition'))),
  Plugin.addModule(AppCapability.operationHandler(() => import('./capabilities/operation-handler'))),
  Plugin.addModule(AppCapability.schema([Markdown.Document, Text.Text])),
  Plugin.make,
);

export default MarkdownPlugin;
