//
// Copyright 2023 DXOS.org
//

import React from 'react';

import {
  type GraphBuilderProvides,
  resolvePlugin,
  type MetadataRecordsProvides,
  type PluginDefinition,
  type SurfaceProvides,
  type TranslationsProvides,
  type Plugin,
  type IntentResolverProvides,
  parseIntentPlugin,
  LayoutAction,
  type GraphProvides,
  parseGraphPlugin,
  NavigationAction,
} from '@dxos/app-framework';
import { createExtension, type Graph, isAction, isGraphNode, type Node, type NodeFilter } from '@dxos/app-graph';
import { invariant } from '@dxos/invariant';
import { Keyboard } from '@dxos/keyboard';
import { LocalStorageStore } from '@dxos/local-storage';
import { Path } from '@dxos/react-ui-mosaic';
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
import { type NavTreeItem } from './types';
import {
  expandOpenGraphNodes,
  getActions,
  getChildren,
  treeItemsFromRootNode,
  type NavTreeItemGraphNode,
} from './util';

export type NavTreePluginProvides = SurfaceProvides &
  MetadataRecordsProvides &
  GraphBuilderProvides &
  TranslationsProvides &
  IntentResolverProvides;

type NavTreeState = {
  root?: NavTreeItemGraphNode;
  flatTree: NavTreeItem[];
  open: string[];
};

export const NavTreePlugin = (): PluginDefinition<NavTreePluginProvides> => {
  let graphPlugin: Plugin<GraphProvides> | undefined;
  let graph: Graph | undefined;
  const itemCache = new Map<string, NavTreeItem>();

  const state = new LocalStorageStore<NavTreeState>('dxos.org/settings/navtree', {
    root: undefined,
    get flatTree() {
      if (!this.root || !graph) {
        return [];
      }

      return treeItemsFromRootNode(graph, this.root, this.open, getItem);
    },
    // TODO(thure): Do this dynamically.
    open: ['root', 'root~dxos.org/plugin/space-spaces', 'root~dxos.org/plugin/files'],
  });

  const getItem = (node: NavTreeItemGraphNode, parent: readonly string[], filter?: NodeFilter) => {
    invariant(graph);
    const path = [...parent, node.id];
    const { actions, groupedActions } = getActions(graph, node);
    const children = getChildren(graph, node, filter, path);
    const parentOf =
      children.length > 0 ? children.map(({ id }) => id) : node.properties.role === 'branch' ? [] : undefined;
    const item = {
      id: node.id,
      label: node.properties.label ?? node.id,
      icon: node.properties.icon,
      disabled: node.properties.disabled,
      testId: node.properties.testId,
      path,
      parentOf,
      node,
      actions,
      groupedActions,
    } satisfies NavTreeItem;

    const cachedItem = itemCache.get(node.id);
    // TODO(wittjosiah): This is not a good enough check.
    //   Consider better ways to doing reactive transformations which retain referential equality.
    if (cachedItem && JSON.stringify(item) === JSON.stringify(cachedItem)) {
      return cachedItem;
    } else {
      itemCache.set(node.id, item);
      return item;
    }
  };

  const handleOpenChange = (item: NavTreeItem, open: boolean) => {
    const path = Path.create(...item.path);
    // TODO(thure): This might become a localstorage leak; openItemIds that no longer exist should be removed from this map.
    if (open) {
      state.values.open.push(path);
    } else {
      const index = state.values.open.indexOf(path);
      if (index > -1) {
        state.values.open.splice(index, 1);
      }
    }

    if (graph) {
      void expandOpenGraphNodes(graph, state.values.open);
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

      state.prop({ key: 'open', type: LocalStorageStore.json<string[]>() });

      void expandOpenGraphNodes(graph, state.values.open);

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
              return (
                <NavTreeContainer
                  items={state.values.flatTree}
                  current={data.activeIds as string[]}
                  open={state.values.open}
                  onOpenChange={handleOpenChange}
                  popoverAnchorId={data.popoverAnchorId as string}
                />
              );

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
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case NavigationAction.EXPOSE: {
              if (graph && intent.data?.id) {
                const path = graph.getPath({ target: intent.data.id });
                if (Array.isArray(path)) {
                  const additionalOpenItems = [...Array(path.length)].reduce((acc: string[], _, index) => {
                    const itemId = Path.create(...path.slice(0, index));
                    if (itemId.length > 0) {
                      acc.push(itemId);
                    }
                    return acc;
                  }, []);
                  state.values.open.push(...additionalOpenItems);
                }
              }
              break;
            }
          }
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
                    icon: 'ph--magnifying-glass--regular',
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
