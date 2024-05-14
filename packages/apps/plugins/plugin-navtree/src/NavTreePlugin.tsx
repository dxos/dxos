//
// Copyright 2023 DXOS.org
//

import { MagnifyingGlass, type IconProps } from '@phosphor-icons/react';
import { effect } from '@preact/signals-core';
import React from 'react';

import { Collection } from '@braneframe/types';
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
import { isAction, isGraphNode, type Node, type NodeFilter } from '@dxos/app-graph';
import { create } from '@dxos/echo-schema';
import { Keyboard } from '@dxos/keyboard';
import { type PartIdentifier } from '@dxos/react-ui-deck';
import { treeNodeFromGraphNode, type TreeNode, getTreeNode } from '@dxos/react-ui-navtree';
import { getHostPlatform } from '@dxos/util';

import {
  CommandsDialogContent,
  NODE_TYPE,
  NavBarStart,
  NavTreeContainer,
  NavTreeDocumentTitle,
  NotchStart,
} from './components';
import { CommandsTrigger } from './components/CommandsTrigger';
import meta, { KEY_BINDING, NAVTREE_PLUGIN } from './meta';
import translations from './translations';

export type NavTreePluginProvides = SurfaceProvides &
  MetadataRecordsProvides &
  GraphBuilderProvides &
  TranslationsProvides;

export const NavTreePlugin = (): PluginDefinition<NavTreePluginProvides> => {
  const longestPaths = new Map<string, string[]>();
  const state = create<{ root?: TreeNode }>({});
  let graphPlugin: Plugin<GraphProvides> | undefined;

  // Filter for the longest path to a node from the root.
  // This is used to determine the nodes to show in the navtree.
  // If an object is in a collection, the longest path to the object is the path through the collection.
  // This will cause the object to be rendered in the collection and not at the root of the space.
  // In the future, expect this logic to be more complex as objects may show up in multiple places, etc.
  const filterLongestPath: NodeFilter = (node, connectedNode): node is Node => {
    // Omit children of collections from the longest path filter.
    // Since objects can be in multiple collections we want all their children to be shown.
    if (connectedNode.data instanceof Collection) {
      return true;
    }

    const longestPath = longestPaths.get(node.id);
    if (!longestPath) {
      return false;
    }

    if (longestPath[longestPath.length - 2] !== connectedNode.id) {
      return false;
    }

    return true;
  };

  return {
    meta,
    ready: async (plugins) => {
      graphPlugin = resolvePlugin(plugins, parseGraphPlugin);

      effect(() => {
        longestPaths.clear();
        graphPlugin?.provides.graph.traverse({
          visitor: (node, path) => {
            const longestPath = longestPaths.get(node.id)?.length ?? 0;
            if (longestPath < path.length) {
              longestPaths.set(node.id, path);
            }

            // TODO(wittjosiah): Factor out.
            let shortcut: string | undefined;
            if (typeof node.properties.keyBinding === 'object') {
              const availablePlatforms = Object.keys(node.properties.keyBinding);
              const platform = getHostPlatform();
              shortcut = availablePlatforms.includes(platform)
                ? node.properties.keyBinding[platform]
                : platform === 'ios'
                  ? node.properties.keyBinding.macos // Fallback to macos if ios-specific bindings not provided.
                  : platform === 'linux' || platform === 'unknown'
                    ? node.properties.keyBinding.windows // Fallback to windows if platform-specific bindings not provided.
                    : undefined;
            } else {
              shortcut = node.properties.keyBinding;
            }

            if (shortcut && isAction(node)) {
              Keyboard.singleton.getContext(path.slice(0, -1).join('/')).bind({
                shortcut,
                handler: () => {
                  node.data({ node, caller: KEY_BINDING });
                },
                data: node.properties.label,
              });
            }
          },
        });
      });

      if (graphPlugin) {
        state.root = treeNodeFromGraphNode(graphPlugin?.provides.graph.root, { filter: filterLongestPath });
      }

      // TODO(burdon): Create context and plugin.
      Keyboard.singleton.initialize();
      Keyboard.singleton.setCurrentContext(graphPlugin?.provides.graph.root.id);
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
              if (state.root) {
                return (
                  <NavTreeContainer
                    root={state.root}
                    paths={longestPaths}
                    activeId={data.activeId as string}
                    popoverAnchorId={data.popoverAnchorId as string}
                    part={data.part as PartIdentifier | undefined}
                  />
                );
              }
              break;

            case 'document-title': {
              const graphNode = isGraphNode(data.activeNode) ? data.activeNode : undefined;
              const path = graphNode?.id ? longestPaths.get(graphNode.id) : undefined;
              const activeNode = path && state.root ? getTreeNode(state.root, path) : undefined;
              return <NavTreeDocumentTitle activeNode={activeNode} />;
            }

            case 'navbar-start': {
              const path = isGraphNode(data.activeNode) && longestPaths.get(data.activeNode.id);
              if (path && state.root) {
                return {
                  node: (
                    <NavBarStart
                      activeNode={data.activeNode as Node}
                      popoverAnchorId={data.popoverAnchorId as string | undefined}
                    />
                  ),
                  disposition: 'hoist',
                };
              }
              break;
            }

            case 'notch-start':
              return <NotchStart />;

            case 'search-input':
              return {
                node: <CommandsTrigger />,
                disposition: 'fallback',
              };
          }

          return null;
        },
      },
      graph: {
        builder: (plugins, graph) => {
          // TODO(burdon): Move to separate plugin (for keys and command k). Move bindings from LayoutPlugin.
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
          graph.addNodes({
            id: 'dxos.org/plugin/navtree/open-commands',
            data: () =>
              intentPlugin?.provides.intent.dispatch({
                action: LayoutAction.SET_LAYOUT,
                data: { element: 'dialog', component: `${NAVTREE_PLUGIN}/Commands`, dialogBlockAlign: 'start' },
              }),
            properties: {
              label: ['open commands label', { ns: NAVTREE_PLUGIN }],
              icon: (props: IconProps) => <MagnifyingGlass {...props} />,
              keyBinding: {
                macos: 'meta+k',
                windows: 'ctrl+k',
              },
            },
            edges: [['root', 'inbound']],
          });
        },
      },
      translations,
    },
  };
};
