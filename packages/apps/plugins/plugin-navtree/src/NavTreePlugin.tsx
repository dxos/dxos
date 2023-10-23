//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type PluginDefinition } from '@dxos/app-framework';
import { Graph, type Node } from '@dxos/app-graph';

import { TreeItemMainHeading, TreeViewContainer, TreeViewDocumentTitle } from './components';
import translations from './translations';
import { NAVTREE_PLUGIN, type NavTreePluginProvides } from './types';

export const NavTreePlugin = (): PluginDefinition<NavTreePluginProvides> => {
  return {
    meta: {
      id: NAVTREE_PLUGIN,
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
