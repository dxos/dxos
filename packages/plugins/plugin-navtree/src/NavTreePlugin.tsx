//
// Copyright 2023 DXOS.org
//

import { effect } from '@preact/signals-core';
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
  parseNavigationPlugin,
  parseLayoutPlugin,
} from '@dxos/app-framework';
import { createExtension, type Graph, isAction, isGraphNode, type Node } from '@dxos/app-graph';
import { type UnsubscribeCallback } from '@dxos/async';
import { create, type ReactiveObject } from '@dxos/echo-schema';
import { Keyboard } from '@dxos/keyboard';
import { type TreeData } from '@dxos/react-ui-list';
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
import { type NavTreeItemGraphNode } from './types';
import { expandChildrenAndActions } from './util';

export type NavTreePluginProvides = SurfaceProvides &
  MetadataRecordsProvides &
  GraphBuilderProvides &
  TranslationsProvides &
  IntentResolverProvides;

const KEY = `${NAVTREE_PLUGIN}/state`;
const getInitialState = () => {
  const stringified = localStorage.getItem(KEY);
  if (!stringified) {
    return;
  }

  try {
    const cached: [string, { open: boolean; current: boolean }][] = JSON.parse(stringified);
    return cached.map(
      ([key, value]): [
        string,
        ReactiveObject<{
          open: boolean;
          current: boolean;
        }>,
      ] => [key, create(value)],
    );
  } catch {}
};

export const NavTreePlugin = (): PluginDefinition<NavTreePluginProvides> => {
  let graphPlugin: Plugin<GraphProvides> | undefined;
  let graph: Graph | undefined;
  let unsubscribe: UnsubscribeCallback | undefined;

  // TODO(wittjosiah): This currently needs to be not a ReactiveObject at the root.
  //   If it is a ReactiveObject then React errors when initializing new paths because of state change during render.
  //   Ideally this could be a ReactiveObject but be able to access and update the root level without breaking render.
  //   Wrapping accesses and updates in `untracked` didn't seem to work in all cases.
  const state = new Map<string, ReactiveObject<{ open: boolean; current: boolean }>>(
    getInitialState() ?? [
      // TODO(thure): Initialize these dynamically.
      ['root', create({ open: true, current: false })],
      ['root~dxos.org/plugin/space-spaces', create({ open: true, current: false })],
      ['root~dxos.org/plugin/files', create({ open: true, current: false })],
    ],
  );

  const getItem = (_path: string[]) => {
    const path = Path.create(..._path);
    const value = state.get(path) ?? create({ open: false, current: false });
    if (!state.has(path)) {
      state.set(path, value);
    }

    return value;
  };

  const setItem = (path: string[], key: 'open' | 'current', next: boolean) => {
    const value = getItem(path);
    value[key] = next;

    localStorage.setItem(KEY, JSON.stringify(Array.from(state.entries())));
  };

  const isOpen = (path: string[]) => getItem(path).open;
  const isCurrent = (path: string[]) => getItem(path).current;

  const handleOpenChange = ({ item: { id }, path, open }: { item: Node; path: string[]; open: boolean }) => {
    // TODO(thure): This might become a localstorage leak; openItemIds that no longer exist should be removed from this map.
    setItem(path, 'open', open);

    if (graph) {
      const node = graph.findNode(id);
      return node && expandChildrenAndActions(graph, node as NavTreeItemGraphNode);
    }
  };

  return {
    meta,
    ready: async (plugins) => {
      const layout = resolvePlugin(plugins, parseLayoutPlugin)?.provides.layout;
      const location = resolvePlugin(plugins, parseNavigationPlugin)?.provides.location;
      graphPlugin = resolvePlugin(plugins, parseGraphPlugin);
      graph = graphPlugin?.provides.graph;
      if (!graph || !location || !layout) {
        return;
      }

      const soloPart = location?.active.solo?.[0];
      const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
      if (dispatch && soloPart) {
        void dispatch({ plugin: NAVTREE_PLUGIN, action: NavigationAction.EXPOSE, data: { id: soloPart.id } });
      }

      let previous: string[] = [];
      unsubscribe = effect(() => {
        const part = layout.layoutMode === 'solo' ? 'solo' : 'main';
        const current = location.active[part]?.map(({ id }) => id) ?? [];
        const removed = previous.filter((id) => !current.includes(id));
        previous = current;

        // TODO(wittjosiah): This is setTimeout because there's a race between the keys be initialized.
        //   This could be avoided if the location was a path as well and not just an id.
        setTimeout(() => {
          removed.forEach((id) => {
            const keys = Array.from(state.keys()).filter((key) => Path.last(key) === id);
            keys.forEach((key) => {
              setItem(Path.parts(key), 'current', false);
            });
          });

          current.forEach((id) => {
            const keys = Array.from(new Set([...state.keys(), id])).filter((key) => Path.last(key) === id);
            keys.forEach((key) => {
              setItem(Path.parts(key), 'current', true);
            });
          });
        });
      });

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
      unsubscribe?.();
      Keyboard.singleton.destroy();
    },
    provides: {
      metadata: {
        records: {
          [NODE_TYPE]: {
            parse: ({ item }: TreeData, type: string) => {
              switch (type) {
                case 'node':
                  return item;
                case 'object':
                  return item.data;
                case 'view-object':
                  return { id: `${item.id}-view`, object: item.data };
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
                  isOpen={isOpen}
                  isCurrent={isCurrent}
                  onOpenChange={handleOpenChange}
                  popoverAnchorId={data.popoverAnchorId as string}
                />
              );

            case 'document-title': {
              return <NavTreeDocumentTitle node={isGraphNode(data.activeNode) ? data.activeNode : undefined} />;
            }

            case 'navbar-start': {
              if (data.activeNode) {
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
        resolver: async (intent) => {
          switch (intent.action) {
            case NavigationAction.EXPOSE: {
              if (graph && intent.data?.id) {
                const path = await graph.waitForPath({ target: intent.data.id });
                [...Array(path.length)].forEach((_, index) => {
                  const subpath = path.slice(0, index);
                  const value = getItem(subpath);
                  if (!value.open) {
                    setItem(subpath, 'open', true);
                  }
                });
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
