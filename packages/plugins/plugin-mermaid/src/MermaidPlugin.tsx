//
// Copyright 2023 DXOS.org
//

import { contributes, defineModule, definePlugin, Events } from '@dxos/app-framework';
import { MarkdownCapabilities } from '@dxos/plugin-markdown';

import { mermaid } from './extensions';
import { meta } from './meta';

export const MermaidPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/markdown`,
      activatesOn: Events.Startup,
      activate: () => contributes(MarkdownCapabilities.Extensions, [mermaid]),
    }),
  ]);
