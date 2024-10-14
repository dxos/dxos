//
// Copyright 2023 DXOS.org
//

import { type PluginDefinition } from '@dxos/app-framework';
import { type MarkdownExtensionProvides } from '@dxos/plugin-markdown';

import { mermaid } from './extensions';
import meta from './meta';

export const MermaidPlugin = (): PluginDefinition<MarkdownExtensionProvides> => {
  return {
    meta,
    provides: {
      markdown: {
        extensions: () => [mermaid()],
      },
    },
  };
};
