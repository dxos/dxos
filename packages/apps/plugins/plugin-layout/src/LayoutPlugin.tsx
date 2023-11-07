//
// Copyright 2023 DXOS.org
//

import { ArrowsOut } from '@phosphor-icons/react';
import { batch } from '@preact/signals-react';
import { type RevertDeepSignal } from 'deepsignal';
import React, { type PropsWithChildren, useEffect } from 'react';

import { useGraph } from '@braneframe/plugin-graph';
import {
  Surface,
  findPlugin,
  resolvePlugin,
  useIntent,
  usePlugins,
  parseGraphPlugin,
  parseIntentPlugin,
  parseSurfacePlugin,
  LayoutAction,
  type Plugin,
  type PluginDefinition,
  type LayoutProvides,
  type IntentResolverProvides,
  type GraphPluginProvides,
  type GraphBuilderProvides,
  type SurfaceProvides,
  type TranslationsProvides,
  type SurfaceProps,
} from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { LocalStorageStore } from '@dxos/local-storage';
import { Mosaic } from '@dxos/react-ui-mosaic';

import { LayoutContext, type LayoutState, useLayout } from './LayoutContext';
import { MainLayout, ContextView, ContentEmpty, LayoutSettings } from './components';
import { activeToUri, uriToActive } from './helpers';
import meta, { LAYOUT_PLUGIN } from './meta';
import translations from './translations';

export type LayoutPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  TranslationsProvides &
  LayoutProvides;

export const LayoutPlugin = (): PluginDefinition<LayoutPluginProvides> => {
  let graphPlugin: Plugin<GraphPluginProvides> | undefined;
  const state = new LocalStorageStore<LayoutState>(LAYOUT_PLUGIN, {
    fullscreen: false,
    sidebarOpen: true,
    complementarySidebarOpen: false,
    enableComplementarySidebar: false,

    dialogContent: 'never',
    dialogOpen: false,

    popoverContent: 'never',
    popoverAnchorId: undefined,
    popoverOpen: false,

    active: undefined,
    previous: undefined,
    get activeNode() {
      invariant(graphPlugin, 'Graph plugin not found.');
      return this.active && graphPlugin.provides.graph.findNode(this.active);
    },
    get previousNode() {
      invariant(graphPlugin, 'Graph plugin not found.');
      return this.previous && graphPlugin.provides.graph.findNode(this.previous);
    },
  });

  return {
    meta,
    ready: async (plugins) => {
      graphPlugin = resolvePlugin(plugins, parseGraphPlugin);

      state
        .prop(state.values.$sidebarOpen!, 'sidebar-open', LocalStorageStore.bool)
        .prop(state.values.$complementarySidebarOpen!, 'complementary-sidebar-open', LocalStorageStore.bool)
        .prop(state.values.$enableComplementarySidebar!, 'enable-complementary-sidebar', LocalStorageStore.bool);
    },
    unload: async () => {
      state.close();
    },
    provides: {
      layout: state.values as RevertDeepSignal<LayoutState>,
      translations,
      // TODO(burdon): Should provides keys be indexed by plugin id (i.e., FQ)?
      graph: {
        builder: ({ parent, plugins }) => {
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
          if (parent.id === 'root') {
            // TODO(burdon): Root menu isn't visible so nothing bound.
            parent.addAction({
              id: LayoutAction.TOGGLE_FULLSCREEN,
              label: ['toggle fullscreen label', { ns: LAYOUT_PLUGIN }],
              icon: (props) => <ArrowsOut {...props} />,
              invoke: () =>
                intentPlugin?.provides.intent.dispatch({
                  plugin: LAYOUT_PLUGIN,
                  action: 'toggle-fullscreen',
                }),
              keyBinding: 'ctrl+meta+f',
            });
          }
        },
      },
      context: (props: PropsWithChildren) => (
        <Mosaic.Root>
          <LayoutContext.Provider value={state.values as RevertDeepSignal<LayoutState>}>
            {props.children}
          </LayoutContext.Provider>
        </Mosaic.Root>
      ),
      root: () => {
        const { plugins } = usePlugins();
        const { dispatch } = useIntent();
        const { graph } = useGraph();
        const layout = useLayout();
        const [shortId, component] = layout.active?.split(':') ?? [];
        const plugin = parseSurfacePlugin(findPlugin(plugins, shortId));
        const result = plugin?.provides.surface.component({ data: { component } });

        // Update selection based on browser navigation.
        useEffect(() => {
          const handleNavigation = async () => {
            await dispatch({
              plugin: LAYOUT_PLUGIN,
              action: LayoutAction.ACTIVATE,
              data: {
                // TODO(wittjosiah): Remove condition. This is here for backwards compatibility.
                id:
                  window.location.pathname === '/embedded' ? 'github:embedded' : uriToActive(window.location.pathname),
              },
            });
          };

          if (!state.values.active && window.location.pathname.length > 1) {
            void handleNavigation();
          }

          window.addEventListener('popstate', handleNavigation);
          return () => {
            window.removeEventListener('popstate', handleNavigation);
          };
        }, []);

        // Update URL when selection changes.
        useEffect(() => {
          const selectedPath = activeToUri(state.values.active);
          if (window.location.pathname !== selectedPath) {
            // TODO(wittjosiah): Better support for search params?
            history.pushState(null, '', `${selectedPath}${window.location.search}`);
          }
        }, [state.values.active]);

        const surfaceProps: SurfaceProps = layout.activeNode
          ? state.values.fullscreen
            ? {
                data: { component: `${LAYOUT_PLUGIN}/MainLayout` },
                surfaces: { main: { data: { active: layout.activeNode.data } } },
              }
            : {
                data: { component: `${LAYOUT_PLUGIN}/MainLayout` },
                surfaces: {
                  sidebar: {
                    data: { graph, activeId: layout.active, popoverAnchorId: layout.popoverAnchorId },
                  },
                  complementary: {
                    data: { component: `${LAYOUT_PLUGIN}/ContextView`, active: layout.activeNode.data },
                  },
                  main: { data: { active: layout.activeNode.data } },
                  presence: { data: { active: layout.activeNode.data } },
                  status: { data: { active: layout.activeNode.data } },
                  heading: { data: { activeNode: layout.activeNode } },
                  documentTitle: { data: { activeNode: layout.activeNode } },
                },
              }
          : {
              data: { component: `${LAYOUT_PLUGIN}/MainLayout` },
              surfaces: {
                sidebar: {
                  data: { graph, activeId: layout.active, popoverAnchorId: layout.popoverAnchorId },
                },
                main: {
                  data: layout.active ? { active: layout.active } : { component: `${LAYOUT_PLUGIN}/ContentEmpty` },
                },
                // TODO(wittjosiah): This plugin should own document title.
                documentTitle: { data: { component: 'dxos.org/plugin/treeview/DocumentTitle' } },
              },
            };

        return (
          <>
            {result || <Surface {...surfaceProps} />}
            <Mosaic.DragOverlay />
          </>
        );
      },
      surface: {
        component: ({ component }, role) => {
          if (role === 'settings') {
            return <LayoutSettings />;
          }

          switch (component) {
            case `${LAYOUT_PLUGIN}/MainLayout`:
              return (
                <MainLayout
                  fullscreen={state.values.fullscreen}
                  showComplementarySidebar={state.values.enableComplementarySidebar}
                />
              );

            case `${LAYOUT_PLUGIN}/ContentEmpty`:
              return <ContentEmpty />;

            case `${LAYOUT_PLUGIN}/ContextView`:
              return <ContextView />;

            default:
              return null;
          }
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            // TODO(wittjosiah): Remove this.
            case 'dxos.org/plugin/layout/enable-complementary-sidebar': {
              state.values.enableComplementarySidebar = intent.data.state ?? !state.values.enableComplementarySidebar;
              return true;
            }

            case LayoutAction.TOGGLE_FULLSCREEN: {
              state.values.fullscreen =
                (intent.data as LayoutAction.ToggleFullscreen)?.state ?? !state.values.fullscreen;
              return true;
            }

            case LayoutAction.TOGGLE_SIDEBAR: {
              state.values.sidebarOpen =
                (intent.data as LayoutAction.ToggleSidebar)?.state ?? !state.values.sidebarOpen;
              return true;
            }

            case LayoutAction.TOGGLE_COMPLEMENTARY_SIDEBAR: {
              state.values.complementarySidebarOpen =
                (intent.data as LayoutAction.ToggleComplementarySidebar).state ??
                !state.values.complementarySidebarOpen;
              return true;
            }

            case LayoutAction.OPEN_DIALOG: {
              const { component, subject } = intent.data as LayoutAction.OpenDialog;
              state.values.dialogOpen = true;
              state.values.dialogContent = { component, subject };
              return true;
            }

            case LayoutAction.CLOSE_DIALOG: {
              state.values.dialogOpen = false;
              state.values.dialogContent = null;
              return true;
            }

            case LayoutAction.OPEN_POPOVER: {
              const { anchorId, component, subject } = intent.data as LayoutAction.OpenPopover;
              state.values.popoverOpen = true;
              state.values.popoverContent = { component, subject };
              state.values.popoverAnchorId = anchorId;
              return true;
            }

            case LayoutAction.CLOSE_POPOVER: {
              state.values.popoverOpen = false;
              state.values.popoverContent = null;
              state.values.popoverAnchorId = undefined;
              return true;
            }

            case LayoutAction.ACTIVATE: {
              batch(() => {
                state.values.previous = state.values.active;
                state.values.active = (intent.data as LayoutAction.Activate).id;
              });
              return true;
            }
          }
        },
      },
    },
  };
};
