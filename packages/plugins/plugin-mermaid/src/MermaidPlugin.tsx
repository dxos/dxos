//
// Copyright 2023 DXOS.org
//

import { contributes, defineModule, definePlugin } from '@dxos/app-framework';
import { MarkdownCapabilities, MarkdownEvents } from '@dxos/plugin-markdown';

import { mermaid } from './extensions';
import { meta } from './meta';

export const MermaidPlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/markdown`,
    activatesOn: MarkdownEvents.SetupExtensions,
    activate: () => contributes(MarkdownCapabilities.Extensions, [mermaid]),
  }),
]);
