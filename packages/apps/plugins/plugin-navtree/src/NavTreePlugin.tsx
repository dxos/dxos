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
import { createExtension, type Graph, isAction, isGraphNode, type Node } from '@dxos/app-graph';
import { Keyboard } from '@dxos/keyboard';
import { LocalStorageStore } from '@dxos/local-storage';
import { type OpenItemIds } from '@dxos/react-ui-navtree';
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
import { expandOpenGraphNodes, getActions, getChildren, type NavTreeItem, type NavTreeItemGraphNode } from './util';

export type NavTreePluginProvides = SurfaceProvides &
  MetadataRecordsProvides &
  GraphBuilderProvides &
  TranslationsProvides;

type NavTreeState = { root?: NavTreeItemGraphNode; openItemIds: OpenItemIds };

export const NavTreePlugin = (): PluginDefinition<NavTreePluginProvides> => {
  const state = new LocalStorageStore<NavTreeState>('dxos.org/settings/navtree', {
    // TODO(thure): Do this dynamically.
    openItemIds: { root: true, 'dxos.org/plugin/space-spaces': true, 'dxos.org/plugin/files': true },
  });

  let graphPlugin: Plugin<GraphProvides> | undefined;
  let graph: Graph | undefined;

  const handleOpenItemIdsChange = (nextOpenItemIds: OpenItemIds) => {
    // TODO(thure): This might become a localstorage leak; openItemIds that no longer exist should be removed from this map.
    state.values.openItemIds = nextOpenItemIds;
    if (graph) {
      void expandOpenGraphNodes(graph, nextOpenItemIds);
    }
  };

  return {
    meta,
    ready: async (plugins) => {
      graphPlugin = resolvePlugin(plugins, parseGraphPlugin);
      graph = graphPlugin?.provides.graph;
      if (!graph) {
        return;
      }

      state.values.root = graph.root as NavTreeItemGraphNode;
      getChildren(graph, state.values.root);
      getActions(graph, state.values.root);

      state.prop({ key: 'openItemIds', storageKey: 'openItemIds', type: LocalStorageStore.json<OpenItemIds>() });

      void expandOpenGraphNodes(graph, state.values.openItemIds);

      // TODO(wittjosiah): Factor out.
      // TODO(wittjosiah): Handle removal of actions.
      graph.subscribeTraverse({
        visitor: (node, path) => {
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
              return <CommandsDialogContent selected={selected} />;
            }
          }

          switch (role) {
            case 'navigation':
              if (state.values.root && state.values.openItemIds) {
                return (
                  <NavTreeContainer
                    root={state.values.root}
                    activeIds={data.activeIds as Set<string>}
                    openItemIds={state.values.openItemIds}
                    onOpenItemIdsChange={handleOpenItemIdsChange}
                    attended={data.attended as Set<string>}
                    popoverAnchorId={data.popoverAnchorId as string}
                  />
                );
              }
              break;

            case 'document-title': {
              return <NavTreeDocumentTitle node={isGraphNode(data.activeNode) ? data.activeNode : undefined} />;
            }

            case 'navbar-start': {
              if (state.values.root && data.activeNode) {
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
                    iconSymbol: 'ph--magnifying-glass--regular',
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
