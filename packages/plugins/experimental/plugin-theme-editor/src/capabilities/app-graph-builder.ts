//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, type PluginsContext } from '@dxos/app-framework';
import { createExtension, type Node } from '@dxos/plugin-graph';

import { themeEditorId } from '../defs';
import { THEME_EDITOR_PLUGIN } from '../meta';

export default (context: PluginsContext) => {
  return contributes(Capabilities.AppGraphBuilder, [
    // Debug node.
    createExtension({
      id: themeEditorId,
      filter: (node): node is Node<null> => {
        return node.id === 'root';
      },
      connector: () => {
        const [graph] = context.requestCapabilities(Capabilities.AppGraph);
        if (!graph) {
          return;
        }

        return [
          {
            id: themeEditorId,
            type: themeEditorId,
            data: themeEditorId,
            properties: {
              label: ['theme editor label', { ns: THEME_EDITOR_PLUGIN }],
              disposition: 'navigation',
              icon: 'ph--palette--regular',
            },
          },
        ];
      },
    }),
  ]);
};
