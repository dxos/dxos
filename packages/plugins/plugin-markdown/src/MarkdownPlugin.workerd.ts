//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Text } from '@dxos/schema';

import { OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { Markdown } from '#types';

export const MarkdownPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Markdown.Document, Text.Text] }),
  Plugin.make,
);

export default MarkdownPlugin;
