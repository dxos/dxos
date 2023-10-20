//
// Copyright 2023 DXOS.org
//

import { Graph } from '@dxos/app-graph';
import { type PluginDefinition } from '@dxos/react-surface';

import { TreeItemMainHeading, TreeViewContainer, TreeViewDocumentTitle } from './components';
import translations from './translations';
import { TREE_VIEW_PLUGIN, type TreeViewPluginProvides } from './types';

export const TreeViewPlugin = (): PluginDefinition<TreeViewPluginProvides> => {
  return {
    meta: {
      id: TREE_VIEW_PLUGIN,
    },
    provides: {
      component: (data, role) => {
        if (!data || typeof data !== 'object') {
          return null;
        }

        switch (role) {
          case 'navigation':
            if ('graph' in data && data.graph instanceof Graph) {
              return TreeViewContainer;
            }
            break;

          case 'document-title':
            return TreeViewDocumentTitle;

          case 'heading':
            if ('label' in data && 'parent' in data) {
              return TreeItemMainHeading;
            }
            break;
        }

        return null;
      },
      translations,
    },
  };
};
