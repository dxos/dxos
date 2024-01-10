//
// Copyright 2023 DXOS.org
//

import { MagnifyingGlass } from '@phosphor-icons/react';
import React from 'react';

import {
  type GraphBuilderProvides,
  resolvePlugin,
  type MetadataRecordsProvides,
  type PluginDefinition,
  type SurfaceProvides,
  type TranslationsProvides,
  type Plugin,
  parseIntentPlugin,
  LayoutAction,
  type GraphProvides,
  parseGraphPlugin,
} from '@dxos/app-framework';
import { Graph, type Node } from '@dxos/app-graph';
import { Keyboard } from '@dxos/keyboard';

import {
  CommandsDialogContent,
  NODE_TYPE,
  TreeItemMainHeading,
  TreeViewContainer,
  TreeViewDocumentTitle,
} from './components';
import meta, { NAVTREE_PLUGIN } from './meta';
import translations from './translations';

export type NavTreePluginProvides = SurfaceProvides &
  MetadataRecordsProvides &
  GraphBuilderProvides &
  TranslationsProvides;

export const NavTreePlugin = (): PluginDefinition<NavTreePluginProvides> => {
  let graphPlugin: Plugin<GraphProvides> | undefined;

  return {
    meta,
    ready: async (plugins) => {
      graphPlugin = resolvePlugin(plugins, parseGraphPlugin);

      // TODO(burdon): Create context and plugin.
      Keyboard.singleton.initialize();
      // TODO(burdon): Move to separate plugin (for keys and command k). Move bindings from LayoutPlugin.
      Keyboard.singleton.bind({
        binding: 'meta+k',
        handler: () => {
          console.log('meta');
        },
        data: 'Command menu',
      });
    },
    unload: async () => {
      Keyboard.singleton.destroy();
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
          switch (data.component) {
            case `${NAVTREE_PLUGIN}/Commands`: {
              const selected = typeof data.subject === 'string' ? data.subject : undefined;
              // TODO(wittjosiah): Pass graph in data.
              return <CommandsDialogContent graph={graphPlugin?.provides.graph} selected={selected} />;
            }
          }

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

            case 'navbar-start':
              if (
                data.activeNode &&
                typeof data.activeNode === 'object' &&
                'label' in data.activeNode &&
                'parent' in data.activeNode
              ) {
                return {
                  node: <TreeItemMainHeading activeNode={data.activeNode as Node} />,
                  disposition: 'hoist',
                };
              }
              break;
          }

          return null;
        },
      },
      graph: {
        builder: ({ parent, plugins }) => {
          if (parent.id !== 'root') {
            return;
          }

          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
          parent.addAction({
            id: 'dxos.org/plugin/navtree/open-commands',
            label: ['open commands label', { ns: NAVTREE_PLUGIN }],
            icon: (props) => <MagnifyingGlass {...props} />,
            keyBinding: 'meta+k',
            invoke: () =>
              intentPlugin?.provides.intent.dispatch({
                action: LayoutAction.OPEN_DIALOG,
                data: { component: `${NAVTREE_PLUGIN}/Commands` },
              }),
          });
        },
      },
      translations,
    },
  };
};
