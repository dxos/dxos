//
// Copyright 2023 DXOS.org
//

import { MagnifyingGlass, type IconProps } from '@phosphor-icons/react';
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
import { createExtension, isAction, isGraphNode, type Node } from '@dxos/app-graph';
import { create } from '@dxos/echo-schema';
import { Keyboard } from '@dxos/keyboard';
import { type LayoutCoordinate } from '@dxos/react-ui-deck';
import { treeNodeFromGraphNode, type TreeNode, getTreeNode, type NavTreeItemData } from '@dxos/react-ui-navtree';
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
  // TODO(wittjosiah): This doesn't support multiple paths for the same node.
  //   Navtree should base active node on just the id rather than the path.
  const paths = new Map<string, string[]>();
  const state = create<{ root?: TreeNode }>({});
  let graphPlugin: Plugin<GraphProvides> | undefined;

  return {
    meta,
    ready: async (plugins) => {
      graphPlugin = resolvePlugin(plugins, parseGraphPlugin);
      const graph = graphPlugin?.provides.graph;
      if (!graph) {
        return;
      }

      state.root = treeNodeFromGraphNode(graph, graph.root);
      state.root.loadChildren();
      state.root.loadActions();

      // TODO(wittjosiah): Factor out.
      // TODO(wittjosiah): Handle removal of actions.
      graph.subscribeTraverse({
        visitor: (node, path) => {
          // TODO(wittjosiah): Remove.
          paths.set(node.id, path);

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
                void node.data({ node, caller: KEY_BINDING });
              },
              data: node.properties.label,
            });
          }
        },
      });

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
            parse: (item: NavTreeItemData, type: string) => {
              switch (type) {
                case 'node':
                  return item.node;
                case 'object':
                  return item.node.data;
                case 'view-object':
                  return { id: `${item.id}-view`, object: item.node.data };
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
                    paths={paths}
                    activeIds={data.activeIds as Set<string>}
                    attended={data.attended as Set<string>}
                    popoverAnchorId={data.popoverAnchorId as string}
                    layoutCoordinate={data.layoutCoordinate as LayoutCoordinate | undefined}
                  />
                );
              }
              break;

            case 'document-title': {
              const graphNode = isGraphNode(data.activeNode) ? data.activeNode : undefined;
              const path = graphNode?.id ? paths.get(graphNode.id) : undefined;
              const activeNode = path && state.root ? getTreeNode(state.root, path) : undefined;
              return <NavTreeDocumentTitle activeNode={activeNode} />;
            }

            case 'navbar-start': {
              const path = isGraphNode(data.activeNode) && paths.get(data.activeNode.id);
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
        builder: (plugins) => {
          // TODO(burdon): Move to separate plugin (for keys and command k). Move bindings from LayoutPlugin.
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

          return [
            createExtension({
              id: NAVTREE_PLUGIN,
              filter: (node): node is Node<null> => node.id === 'root',
              actions: () => [
                {
                  id: 'dxos.org/plugin/navtree/open-commands',
                  data: async () => {
                    await intentPlugin?.provides.intent.dispatch({
                      action: LayoutAction.SET_LAYOUT,
                      data: {
                        element: 'dialog',
                        component: `${NAVTREE_PLUGIN}/Commands`,
                        dialogBlockAlign: 'start',
                      },
                    });
                  },
                  properties: {
                    label: ['open commands label', { ns: NAVTREE_PLUGIN }],
                    icon: (props: IconProps) => <MagnifyingGlass {...props} />,
                    keyBinding: {
                      macos: 'meta+k',
                      windows: 'ctrl+k',
                    },
                  },
                },
              ],
            }),
          ];
        },
      },
      translations,
    },
  };
};
