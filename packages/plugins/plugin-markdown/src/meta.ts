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
    It provides rich text editing as well as read only and markdown view.
    In addition to markdown capabilities, it also support threaded in-line comments which can be accessed from the right hand sidebar at any times inside the document.
    Your AI agent will have access to all markdown docs in your Space which means you can use them to extend the memory of your personal agent and add long term context for automated workflows.
  `,
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-markdown',
  icon: 'ph--text-aa--regular',
  screenshots: ['https://dxos.network/plugin-details-markdown-dark.png'],
};

// TODO(burdon): Workaround for suspected vitest bug?
export const not_meta = meta;
