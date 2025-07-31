//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/markdown',
  name: 'Markdown',
  description: trim`
    A collaborative and extensible Markdown editor.
    In addition to markdown capabilities, the plugin supports collaborative in-line comments.
    You can use documents to extend the memory of your personal agents and add context for automated workflows.
  `,
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-markdown',
  icon: 'ph--text-aa--regular',
  screenshots: ['https://dxos.network/plugin-details-markdown-dark.png'],
};

// TODO(burdon): Workaround for suspected vitest bug?
export const not_meta = meta;
