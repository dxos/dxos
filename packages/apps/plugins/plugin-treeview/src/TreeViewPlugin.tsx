//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Graph, type Node } from '@dxos/app-graph';
import { type PluginDefinition } from '@dxos/app-framework';

import { TreeItemMainHeading, TreeViewContainer, TreeViewDocumentTitle } from './components';
import translations from './translations';
import { TREE_VIEW_PLUGIN, type TreeViewPluginProvides } from './types';

export const TreeViewPlugin = (): PluginDefinition<TreeViewPluginProvides> => {
  return {
    meta: {
      id: TREE_VIEW_PLUGIN,
    },
    provides: {
      surface: {
        component: ({ $role, ...data }) => {
          switch ($role) {
            case 'navigation':
              if ('graph' in data && data.graph instanceof Graph) {
                return (
                  <TreeViewContainer
                    graph={data.graph}
                    activeId={data.activeId as string}
                    popoverAnchorId={data.popoverAnchorId as string}
                  />
                );
              }
              break;

            case 'document-title':
              return <TreeViewDocumentTitle activeNode={data.activeNode as Node | undefined} />;

            case 'heading':
              if (
                data.activeNode &&
                typeof data.activeNode === 'object' &&
                'label' in data.activeNode &&
                'parent' in data.activeNode
              ) {
                return <TreeItemMainHeading activeNode={data.activeNode as Node} />;
              }
              break;
          }

          return null;
        },
      },
      translations,
    },
  };
};
