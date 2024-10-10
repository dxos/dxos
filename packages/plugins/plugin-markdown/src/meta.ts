//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const MARKDOWN_PLUGIN = 'dxos.org/plugin/markdown';

export default {
  id: MARKDOWN_PLUGIN,
  name: 'Editor',
  description: 'Markdown text editor.',
  homePage: 'https://github.com/dxos/dxos/tree/main/packages/apps/plugins/plugin-markdown',
  icon: 'ph--text-aa--regular',
} satisfies PluginMeta;
