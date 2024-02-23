//
// Copyright 2023 DXOS.org
//

import { MagnifyingGlass, type IconProps } from '@phosphor-icons/react';
import { effect } from '@preact/signals-core';
import { deepSignal, type RevertDeepSignal } from 'deepsignal/react';
import get from 'lodash.get';
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
import { isGraphNode, type Node, type NodeFilter } from '@dxos/app-graph';
import { Keyboard } from '@dxos/keyboard';
import { treeNodeFromGraphNode, type TreeNode, getTreePath } from '@dxos/react-ui-navtree';

import {
  CommandsDialogContent,
  NODE_TYPE,
  NavBarStart,
  NavTreeContainer,
  NavTreeDocumentTitle,
  NotchStart,
} from './components';
import { CommandsTrigger } from './components/CommandsTrigger';
import meta, { NAVTREE_PLUGIN } from './meta';
import translations from './translations';

export type NavTreePluginProvides = SurfaceProvides &
  MetadataRecordsProvides &
  GraphBuilderProvides &
  TranslationsProvides;

export const NavTreePlugin = (): PluginDefinition<NavTreePluginProvides> => {
  const state = deepSignal<{ root?: TreeNode; longestPaths: Record<string, string[]> }>({ longestPaths: {} });
  let graphPlugin: Plugin<GraphProvides> | undefined;

  const filterLongestPath: NodeFilter = (node, connectedNode): node is Node => {
    const longestPath = state.longestPaths[node.id];
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
        graphPlugin?.provides.graph.traverse({
          visitor: (node, path) => {
            if (!(node.id in state.longestPaths) || state.longestPaths[node.id].length < path.length) {
              state.longestPaths[node.id] = path;
            }
          },
        });
      });

      if (graphPlugin) {
        state.root = treeNodeFromGraphNode(graphPlugin?.provides.graph.root, { filter: filterLongestPath });
      }

      // TODO(burdon): Create context and plugin.
      Keyboard.singleton.initialize();
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
              if (graphPlugin && state.root) {
                return (
                  <NavTreeContainer
                    root={state.root as RevertDeepSignal<TreeNode>}
                    graph={graphPlugin.provides.graph}
                    activeId={data.activeId as string}
                    popoverAnchorId={data.popoverAnchorId as string}
                  />
                );
              }
              break;

            case 'document-title': {
              const graphNode = isGraphNode(data.activeNode) ? data.activeNode : undefined;
              const path =
                graphNode?.id &&
                getTreePath({
                  graph: graphPlugin!.provides.graph,
                  tree: state.root as RevertDeepSignal<TreeNode>,
                  to: graphNode?.id,
                });
              const activeNode = path ? get(state.root, path) : undefined;
              return <NavTreeDocumentTitle activeNode={activeNode} />;
            }

            case 'navbar-start':
              if (isGraphNode(data.activeNode)) {
                const path = getTreePath({
                  graph: graphPlugin!.provides.graph,
                  tree: state.root as RevertDeepSignal<TreeNode>,
                  to: data.activeNode.id,
                });

                return {
                  node: (
                    <NavBarStart
                      activeNode={get(state.root, path)}
                      popoverAnchorId={data.popoverAnchorId as string | undefined}
                    />
                  ),
                  disposition: 'hoist',
                };
              }
              break;

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
                data: { element: 'dialog', component: `${NAVTREE_PLUGIN}/Commands` },
              }),
            properties: {
              label: ['open commands label', { ns: NAVTREE_PLUGIN }],
              icon: (props: IconProps) => <MagnifyingGlass {...props} />,
              keyBinding: 'meta+k',
            },
          });
        },
      },
      translations,
    },
  };
};
