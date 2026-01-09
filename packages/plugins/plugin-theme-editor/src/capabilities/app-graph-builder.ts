//
// Copyright 2025 DXOS.org
//

import { Capabilities, type PluginContext, contributes, defineCapabilityModule } from '@dxos/app-framework';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';

import { themeEditorId } from '../defs';
import { meta } from '../meta';

export default defineCapabilityModule((context: PluginContext) => {
  return contributes(Capabilities.AppGraphBuilder, [
    GraphBuilder.createExtension({
      id: themeEditorId,
      match: NodeMatcher.whenRoot,
      connector: () => [
        {
          id: themeEditorId,
          type: themeEditorId,
          data: themeEditorId,
          properties: {
            label: ['theme editor label', { ns: meta.id }],
            disposition: 'navigation',
            icon: 'ph--palette--regular',
          },
        },
      ],
    }),
  ]);
});
