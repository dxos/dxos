//
// Copyright 2023 DXOS.org
//

import { ArrowsOut, type IconProps } from '@phosphor-icons/react';
import { batch } from '@preact/signals-core';
import React, { type PropsWithChildren, useEffect, useMemo } from 'react';

import { type Node, useGraph } from '@braneframe/plugin-graph';
import { ObservabilityAction } from '@braneframe/plugin-observability/meta';
import {
  findPlugin,
  parseGraphPlugin,
  parseIntentPlugin,
  parseSurfacePlugin,
  resolvePlugin,
  useIntent,
  usePlugins,
  LayoutAction,
  NavigationAction,
  Surface,
  Toast as ToastSchema,
  type IntentPluginProvides,
  type Location,
  type Plugin,
  type PluginDefinition,
  type GraphProvides,
  type SurfaceProps,
  type Layout,
  IntentAction,
} from '@dxos/app-framework';
import { create } from '@dxos/echo-schema/schema';
import { invariant } from '@dxos/invariant';
import { Keyboard } from '@dxos/keyboard';
import { LocalStorageStore } from '@dxos/local-storage';
import { AttentionProvider } from '@dxos/react-ui-deck';
import { Mosaic } from '@dxos/react-ui-mosaic';
import { activeToUri, checkAppScheme, uriToActive } from '@dxos/util';

import { LayoutContext, MainLayout, ContentEmpty, LayoutSettings, ContentFallback } from './components';
import meta, { DECK_PLUGIN } from './meta';
import translations from './translations';
import { type LayoutPluginProvides, type LayoutSettingsProps } from './types';

const isSocket = !!(globalThis as any).__args;
// TODO(mjamesderocher): Can we get this directly from Socket?
const appScheme = 'composer://';

type NavigationState = Location & {
  activeNode: Node | undefined;
  previousNode: Node | undefined;
};

export const DeckPlugin = ({
  observability,
}: {
  observability?: boolean;
} = {}): PluginDefinition<LayoutPluginProvides> => {
  let graphPlugin: Plugin<GraphProvides> | undefined;
  // TODO(burdon): GraphPlugin vs. IntentPluginProvides? (@wittjosiah).
  let intentPlugin: Plugin<IntentPluginProvides> | undefined;
  let currentUndoId: string | undefined;

  const settings = new LocalStorageStore<LayoutSettingsProps>(DECK_PLUGIN, {
    showFooter: false,
    enableNativeRedirect: false,
  });

  const layout = new LocalStorageStore<Layout>(DECK_PLUGIN, {
    fullscreen: false,
    sidebarOpen: true,

    complementarySidebarOpen: false,
    complementarySidebarContent: null,

    dialogContent: null,
    dialogOpen: false,
    dialogBlockAlign: undefined,

    popoverContent: null,
    popoverAnchorId: undefined,
    popoverOpen: false,

    toasts: [],
  });

  const location = create<NavigationState>({
    active: undefined,
    previous: undefined,

    // TODO(burdon): Should not be on this object.
    get activeNode() {
      invariant(graphPlugin, 'Graph plugin not found.');
      return this.active && graphPlugin.provides.graph.findNode(this.active);
    },
    get previousNode() {
      invariant(graphPlugin, 'Graph plugin not found.');
      return this.previous && graphPlugin.provides.graph.findNode(this.previous);
    },
  });

  const handleSetLayout = ({
    element,
    state,
    component,
    subject,
    anchorId,
    dialogBlockAlign,
  }: LayoutAction.SetLayout) => {
    switch (element) {
      case 'fullscreen': {
        layout.values.fullscreen = state ?? !layout.values.fullscreen;
        return { data: true };
      }

      case 'sidebar': {
        layout.values.sidebarOpen = state ?? !layout.values.sidebarOpen;
        return { data: true };
      }

      case 'complementary': {
        layout.values.complementarySidebarOpen = !!state;
        layout.values.complementarySidebarContent = component || subject ? { component, subject } : null;
        return { data: true };
      }

      case 'dialog': {
        layout.values.dialogOpen = state ?? Boolean(component);
        layout.values.dialogContent = component ? { component, subject } : null;
        layout.values.dialogBlockAlign = dialogBlockAlign ?? 'center';
        return { data: true };
      }

      case 'popover': {
        layout.values.popoverOpen = state ?? Boolean(component);
        layout.values.popoverContent = component ? { component, subject } : null;
        layout.values.popoverAnchorId = anchorId;
        return { data: true };
      }

      case 'toast': {
        if (ToastSchema.safeParse(subject).success) {
          layout.values.toasts = [...layout.values.toasts, subject];
          return { data: true };
        }
      }
    }
  };

  return {
    meta,
    ready: async (plugins) => {
      intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
      graphPlugin = resolvePlugin(plugins, parseGraphPlugin);

      layout.prop({ key: 'sidebarOpen', storageKey: 'sidebar-open', type: LocalStorageStore.bool() });

      // prettier-ignore
      settings
        .prop({ key: 'showFooter', storageKey: 'show-footer', type: LocalStorageStore.bool() })
        .prop({ key: 'enableNativeRedirect', storageKey: 'enable-native-redirect', type: LocalStorageStore.bool() });

      if (!isSocket && settings.values.enableNativeRedirect) {
        checkAppScheme(appScheme);
      }
    },
    unload: async () => {
      layout.close();
    },
    provides: {
      settings: settings.values,
      layout: layout.values,
      location,
      translations,
      graph: {
        builder: (_, graph) => {
          // TODO(burdon): Root menu isn't visible so nothing bound.
          graph.addNodes({
            id: `${LayoutAction.SET_LAYOUT}/fullscreen`,
            data: () =>
              intentPlugin?.provides.intent.dispatch({
                plugin: DECK_PLUGIN,
                action: LayoutAction.SET_LAYOUT,
                data: { element: 'fullscreen' },
              }),
            properties: {
              label: ['toggle fullscreen label', { ns: DECK_PLUGIN }],
              icon: (props: IconProps) => <ArrowsOut {...props} />,
              keyBinding: {
                macos: 'ctrl+meta+f',
                windows: 'shift+ctrl+f',
              },
            },
            edges: [['root', 'inbound']],
          });
        },
      },
      context: (props: PropsWithChildren) => (
        <Mosaic.Root>
          <LayoutContext.Provider value={layout.values}>{props.children}</LayoutContext.Provider>
        </Mosaic.Root>
      ),
      root: () => {
        const { plugins } = usePlugins();
        const { dispatch } = useIntent();
        const { graph } = useGraph();
        const [shortId, component] = location.active?.split(':') ?? [];
        const plugin = parseSurfacePlugin(findPlugin(plugins, shortId));

        // Update selection based on browser navigation.
        useEffect(() => {
          const handleNavigation = async () => {
            await dispatch({
              plugin: DECK_PLUGIN,
              action: NavigationAction.ACTIVATE,
              data: { id: uriToActive(window.location.pathname) },
            });
          };

          if (!location.active && window.location.pathname.length > 1) {
            void handleNavigation();
          }

          window.addEventListener('popstate', handleNavigation);
          return () => {
            window.removeEventListener('popstate', handleNavigation);
          };
        }, []);

        // Update URL when selection changes.
        useEffect(() => {
          const selectedPath = activeToUri(location.active);
          if (window.location.pathname !== selectedPath) {
            // TODO(wittjosiah): Better support for search params?
            history.pushState(null, '', `${selectedPath}${window.location.search}`);
          }
        }, [location.active]);

        const surfaceProps: SurfaceProps = plugin
          ? { data: { component: `${plugin.meta.id}/${component}` } }
          : location.activeNode
            ? layout.values.fullscreen
              ? {
                  data: { component: `${DECK_PLUGIN}/MainLayout` },
                  surfaces: { main: { data: { active: location.activeNode.data } } },
                }
              : {
                  data: { component: `${DECK_PLUGIN}/MainLayout` },
                  surfaces: {
                    sidebar: {
                      data: { graph, activeId: location.active, popoverAnchorId: layout.values.popoverAnchorId },
                    },
                    main: { data: { active: location.activeNode.data } },
                    'navbar-start': {
                      data: { activeNode: location.activeNode, popoverAnchorId: layout.values.popoverAnchorId },
                    },
                    'navbar-end': { data: { object: location.activeNode.data } },
                    status: { data: { active: location.activeNode.data } },
                    documentTitle: { data: { activeNode: location.activeNode } },
                  },
                }
            : {
                data: { component: `${DECK_PLUGIN}/MainLayout` },
                surfaces: {
                  sidebar: {
                    data: { graph, activeId: location.active, popoverAnchorId: layout.values.popoverAnchorId },
                  },
                  main: {
                    data: location.active ? { active: location.active } : { component: `${DECK_PLUGIN}/ContentEmpty` },
                  },
                  // TODO(wittjosiah): This plugin should own document title.
                  documentTitle: { data: { component: `${DECK_PLUGIN}/DocumentTitle` } },
                },
              };

        const attended = useMemo(() => new Set(location.active ? [location.active] : []), [location.active]);

        return (
          <AttentionProvider attended={attended}>
            <Surface {...surfaceProps} />
            <Mosaic.DragOverlay />
          </AttentionProvider>
        );
      },
      surface: {
        component: ({ data, role }) => {
          switch (data.component) {
            case `${DECK_PLUGIN}/MainLayout`:
              return (
                <MainLayout
                  fullscreen={layout.values.fullscreen}
                  showHintsFooter={settings.values.showFooter}
                  toasts={layout.values.toasts}
                  onDismissToast={(id) => {
                    const index = layout.values.toasts.findIndex((toast) => toast.id === id);
                    if (index !== -1) {
                      // Allow time for the toast to animate out.
                      setTimeout(() => {
                        if (layout.values.toasts[index].id === currentUndoId) {
                          currentUndoId = undefined;
                        }
                        layout.values.toasts.splice(index, 1);
                      }, 1000);
                    }
                  }}
                />
              );

            case `${DECK_PLUGIN}/ContentEmpty`:
              return <ContentEmpty />;
          }

          switch (role) {
            case 'main':
              return {
                node: <ContentFallback />,
                disposition: 'fallback',
              };

            case 'settings':
              return data.plugin === meta.id ? <LayoutSettings settings={settings.values} /> : null;
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case LayoutAction.SET_LAYOUT: {
              return intent.data && handleSetLayout(intent.data as LayoutAction.SetLayout);
            }

            case IntentAction.SHOW_UNDO: {
              // TODO(wittjosiah): Support undoing further back than the last action.
              if (currentUndoId) {
                layout.values.toasts = layout.values.toasts.filter((toast) => toast.id !== currentUndoId);
              }
              currentUndoId = `${IntentAction.SHOW_UNDO}-${Date.now()}`;
              const title =
                // TODO(wittjosiah): How to handle chains better?
                intent.data?.results?.[0]?.result?.undoable?.message ??
                translations[0]['en-US']['dxos.org/plugin/deck']['undo available label'];
              layout.values.toasts = [
                ...layout.values.toasts,
                {
                  id: currentUndoId,
                  title,
                  duration: 10_000,
                  actionLabel: translations[0]['en-US']['dxos.org/plugin/deck']['undo action label'],
                  actionAlt: translations[0]['en-US']['dxos.org/plugin/deck']['undo action alt'],
                  closeLabel: translations[0]['en-US']['dxos.org/plugin/deck']['undo close label'],
                  onAction: () => intentPlugin?.provides.intent.undo?.(),
                },
              ];
              return { data: true };
            }

            // TODO(wittjosiah): Factor out.
            case NavigationAction.ACTIVATE: {
              const id = intent.data?.id ?? intent.data?.result?.id;
              const path = id && graphPlugin?.provides.graph.getPath({ target: id });
              if (path) {
                // TODO(wittjosiah): Factor out.
                Keyboard.singleton.setCurrentContext(path.join('/'));
              }

              batch(() => {
                location.previous = location.active;
                location.active = id;
              });

              const schema = location.activeNode?.data?.__typename;

              return {
                data: {
                  id,
                  path,
                  active: true,
                },
                intents: [
                  observability
                    ? [
                        {
                          action: ObservabilityAction.SEND_EVENT,
                          data: {
                            name: 'navigation.activate',
                            properties: {
                              id,
                              schema,
                            },
                          },
                        },
                      ]
                    : [],
                ],
              };
            }
          }
        },
      },
    },
  };
};
