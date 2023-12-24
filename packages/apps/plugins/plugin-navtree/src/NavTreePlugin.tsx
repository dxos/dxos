//
// Copyright 2023 DXOS.org
//

import React from 'react';

import {
  type MetadataRecordsProvides,
  type PluginDefinition,
  type SurfaceProvides,
  type TranslationsProvides,
} from '@dxos/app-framework';
import { Graph, type Node } from '@dxos/app-graph';
import { Keyboard } from '@dxos/keyboard';

import { NODE_TYPE, TreeItemMainHeading, TreeViewContainer, TreeViewDocumentTitle } from './components';
import meta from './meta';
import translations from './translations';

export type NavTreePluginProvides = SurfaceProvides & MetadataRecordsProvides & TranslationsProvides;

export const NavTreePlugin = (): PluginDefinition<NavTreePluginProvides> => {
  return {
    meta,
    ready: async () => {
      console.log('ready');
      Keyboard.singleton.bind({
        binding: 'meta+k',
        handler: () => {
          console.log('@@@');
        },
      });
    },
    provides: {
      metadata: {
        records: {
          [NODE_TYPE]: {
            parse: (node: Node, type: string) => {
              switch (type) {
                case 'node':
                  return node;
                case 'object':
                  return node.data;
                case 'view-object':
                  return { id: `${node.id}-view`, object: node.data };
              }
            },
          },
        },
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
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
