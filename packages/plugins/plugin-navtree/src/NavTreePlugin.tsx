//
// Copyright 2023 DXOS.org
//

import { effect } from '@preact/signals-core';
import React from 'react';

import {
  createIntent,
  createResolver,
  createSurface,
  type GraphBuilderProvides,
  type GraphProvides,
  type IntentResolverProvides,
  LayoutAction,
  type MetadataRecordsProvides,
  NavigationAction,
  parseGraphPlugin,
  parseIntentPlugin,
  parseLayoutPlugin,
  parseNavigationPlugin,
  type Plugin,
  type PluginDefinition,
  resolvePlugin,
  type SurfaceProvides,
  type TranslationsProvides,
} from '@dxos/app-framework';
import { createExtension, type Graph, isAction, isGraphNode, type Node } from '@dxos/app-graph';
import { type UnsubscribeCallback } from '@dxos/async';
import { Keyboard } from '@dxos/keyboard';
import { create, type ReactiveObject } from '@dxos/live-object';
import { type TreeData } from '@dxos/react-ui-list';
import { Path } from '@dxos/react-ui-mosaic';
import { getHostPlatform } from '@dxos/util';

import { CommandsDialogContent, NavTreeContainer, NavTreeDocumentTitle, NODE_TYPE, NotchStart } from './components';
import { CommandsTrigger } from './components/CommandsTrigger';
import meta, { COMMANDS_DIALOG, KEY_BINDING, NAVTREE_PLUGIN } from './meta';
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
      ] => [key, create({ open: value.open, current: false })],
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
    ready: async ({ plugins }) => {
      const layout = resolvePlugin(plugins, parseLayoutPlugin)?.provides.layout;
      const location = resolvePlugin(plugins, parseNavigationPlugin)?.provides.location;
      graphPlugin = resolvePlugin(plugins, parseGraphPlugin);
      graph = graphPlugin?.provides.graph;
      if (!graph || !location || !layout) {
        return;
      }

      const soloPart = location?.active.solo?.[0];
      const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatchPromise;
      if (dispatch && soloPart) {
        void dispatch(createIntent(NavigationAction.Expose, { id: soloPart.id }));
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
        definitions: () => [
          createSurface({
            id: COMMANDS_DIALOG,
            role: 'dialog',
            filter: (data): data is { subject?: string } => data.component === COMMANDS_DIALOG,
            component: ({ data }) => <CommandsDialogContent selected={data.subject} />,
          }),
          createSurface({
            id: `${NAVTREE_PLUGIN}/navigation`,
            role: 'navigation',
            component: ({ data }) => (
              <NavTreeContainer
                isOpen={isOpen}
                isCurrent={isCurrent}
                onOpenChange={handleOpenChange}
                popoverAnchorId={data.popoverAnchorId as string | undefined}
              />
            ),
          }),
          createSurface({
            id: `${NAVTREE_PLUGIN}/document-title`,
            role: 'document-title',
            component: ({ data }) => (
              <NavTreeDocumentTitle node={isGraphNode(data.subject) ? data.subject : undefined} />
            ),
          }),
          createSurface({
            id: `${NAVTREE_PLUGIN}/notch-start`,
            role: 'notch-start',
            component: () => <NotchStart />,
          }),
          createSurface({
            id: `${NAVTREE_PLUGIN}/search-input`,
            role: 'search-input',
            disposition: 'fallback',
            component: () => <CommandsTrigger />,
          }),
        ],
      },
      intent: {
        resolvers: ({ plugins }) => {
          const graph = resolvePlugin(plugins, parseGraphPlugin)?.provides.graph;
          if (!graph) {
            return [];
          }

          return createResolver(NavigationAction.Expose, async ({ id }) => {
            const path = await graph.waitForPath({ target: id });
            [...Array(path.length)].forEach((_, index) => {
              const subpath = path.slice(0, index);
              const value = getItem(subpath);
              if (!value.open) {
                setItem(subpath, 'open', true);
              }
            });
          });
        },
      },
      graph: {
        builder: (plugins) => {
          // TODO(burdon): Move to separate plugin (for keys and command k). Move bindings from LayoutPlugin.
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatchPromise;

          return [
            createExtension({
              id: NAVTREE_PLUGIN,
              filter: (node): node is Node<null> => node.id === 'root',
              actions: () => [
                {
                  id: COMMANDS_DIALOG,
                  data: async () => {
                    await dispatch?.(
                      createIntent(LayoutAction.SetLayout, {
                        element: 'dialog',
                        component: COMMANDS_DIALOG,
                        dialogBlockAlign: 'start',
                      }),
                    );
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
