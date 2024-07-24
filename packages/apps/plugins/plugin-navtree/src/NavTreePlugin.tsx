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
import { createExtension, isGraphNode, type Node } from '@dxos/app-graph';
import { create } from '@dxos/echo-schema';
import { Keyboard } from '@dxos/keyboard';
import { type LayoutCoordinate } from '@dxos/react-ui-deck';

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
import { getActions, getChildren, type NavTreeItem, type NavTreeItemGraphNode } from './util';

export type NavTreePluginProvides = SurfaceProvides &
  MetadataRecordsProvides &
  GraphBuilderProvides &
  TranslationsProvides;

export const NavTreePlugin = (): PluginDefinition<NavTreePluginProvides> => {
  const state = create<{ root?: NavTreeItemGraphNode; openItemPaths?: Set<string> }>({});
  const handleOpenItemPathsChange = (nextOpenItemPaths: Set<string>) => (state.openItemPaths = nextOpenItemPaths);

  let graphPlugin: Plugin<GraphProvides> | undefined;

  return {
    meta,
    ready: async (plugins) => {
      graphPlugin = resolvePlugin(plugins, parseGraphPlugin);
      const graph = graphPlugin?.provides.graph;
      if (!graph) {
        return;
      }

      state.root = graph.root as NavTreeItemGraphNode;
      getChildren(graph, state.root);
      getActions(graph, state.root, [state.root.id]);

      state.openItemPaths = new Set(['root']);

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
            parse: (item: NavTreeItem, type: string) => {
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
              if (state.root && state.openItemPaths) {
                return (
                  <NavTreeContainer
                    root={state.root}
                    activeIds={data.activeIds as Set<string>}
                    openItemPaths={state.openItemPaths}
                    onOpenItemPathsChange={handleOpenItemPathsChange}
                    attended={data.attended as Set<string>}
                    popoverAnchorId={data.popoverAnchorId as string}
                    layoutCoordinate={data.layoutCoordinate as LayoutCoordinate | undefined}
                  />
                );
              }
              break;

            case 'document-title': {
              const graphNode = isGraphNode(data.activeNode) ? data.activeNode : undefined;
              return <NavTreeDocumentTitle activeNode={graphNode} />;
            }

            case 'navbar-start': {
              if (state.root) {
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
