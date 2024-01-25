//
// Copyright 2023 DXOS.org
//

import { type MarkdownProvides } from '@braneframe/plugin-markdown';
import { type PluginDefinition } from '@dxos/app-framework';

import { mermaid } from './extensions';
import meta from './meta';

export const MermaidPlugin = (): PluginDefinition<MarkdownProvides> => {
  return {
    meta,
    provides: {
      markdown: {
        extensions: () => [mermaid()],
      },
    },
  };
};
