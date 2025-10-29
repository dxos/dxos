//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/markdown',
  name: 'Markdown',
  description: trim`
    Full-featured collaborative markdown editor with real-time editing, inline comments, and rich formatting.
    Supports AI-powered editing assistance and seamlessly integrates with other workspace objects.
  `,
  icon: 'ph--text-aa--regular',
  iconHue: 'indigo',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-markdown',
  screenshots: ['https://dxos.network/plugin-details-markdown-dark.png'],
};
