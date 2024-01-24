//
// Copyright 2023 DXOS.org
//

import { ArrowsOut } from '@phosphor-icons/react';
import { batch } from '@preact/signals-react';
import { type RevertDeepSignal } from 'deepsignal';
import React, { type PropsWithChildren, useEffect } from 'react';

import { useGraph } from '@braneframe/plugin-graph';
import {
  findPlugin,
  parseGraphPlugin,
  parseIntentPlugin,
  parseSurfacePlugin,
  resolvePlugin,
  useIntent,
  usePlugins,
  LayoutAction,
  Surface,
  type IntentPluginProvides,
  type Plugin,
  type PluginDefinition,
  type GraphProvides,
  type SurfaceProps,
} from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { Keyboard } from '@dxos/keyboard';
import { LocalStorageStore } from '@dxos/local-storage';
import { Mosaic } from '@dxos/react-ui-mosaic';

import { LayoutContext, type LayoutState, useLayout } from './LayoutContext';
import { MainLayout, ContextPanel, ContentEmpty, LayoutSettings } from './components';
import { activeToUri, uriToActive } from './helpers';
import meta, { LAYOUT_PLUGIN } from './meta';
import translations from './translations';
import { type LayoutPluginProvides, type LayoutSettingsProps } from './types';

export const LayoutPlugin = (): PluginDefinition<LayoutPluginProvides> => {
  let graphPlugin: Plugin<GraphProvides> | undefined;
  // TODO(burdon): GraphPlugin vs. IntentPluginProvides? (@wittjosiah).
  let intentPlugin: Plugin<IntentPluginProvides> | undefined;

  const state = new LocalStorageStore<LayoutState & LayoutSettingsProps>(LAYOUT_PLUGIN, {
    fullscreen: false,
    sidebarOpen: true,
    complementarySidebarOpen: false,
    enableComplementarySidebar: true,
    showFooter: false,

    dialogContent: 'never',
    dialogOpen: false,

    popoverContent: 'never',
    popoverAnchorId: undefined,
    popoverOpen: false,

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

  return {
    meta,
    ready: async (plugins) => {
      intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
      graphPlugin = resolvePlugin(plugins, parseGraphPlugin);
      state
        .prop(state.values.$sidebarOpen!, 'sidebar-open', LocalStorageStore.bool)
        .prop(state.values.$complementarySidebarOpen!, 'complementary-sidebar-open', LocalStorageStore.bool)
        .prop(state.values.$enableComplementarySidebar!, 'enable-complementary-sidebar', LocalStorageStore.bool)
        .prop(state.values.$showFooter!, 'show-footer', LocalStorageStore.bool);

      // TODO(burdon): Create context and plugin.
      Keyboard.singleton.initialize();
    },
    unload: async () => {
      Keyboard.singleton.destroy();
      state.close();
    },
    provides: {
      // TODO(wittjosiah): Does this need to be provided twice? Does it matter?
      layout: state.values as RevertDeepSignal<LayoutState>,
      settings: state.values,
      translations,
      graph: {
        builder: ({ parent }) => {
          if (parent.id === 'root') {
            // TODO(burdon): Root menu isn't visible so nothing bound.
            parent.addAction({
              id: LayoutAction.TOGGLE_FULLSCREEN,
              label: ['toggle fullscreen label', { ns: LAYOUT_PLUGIN }],
              icon: (props) => <ArrowsOut {...props} />,
              keyBinding: 'ctrl+meta+f',
              invoke: () =>
                intentPlugin?.provides.intent.dispatch({
                  plugin: LAYOUT_PLUGIN,
                  action: LayoutAction.TOGGLE_FULLSCREEN,
                }),
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

        const surfaceProps: SurfaceProps = plugin
          ? { data: { component: `${plugin.meta.id}/${component}` } }
          : layout.activeNode
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
                  context: {
                    data: { component: `${LAYOUT_PLUGIN}/ContextView`, active: layout.activeNode.data },
                  },
                  main: { data: { active: layout.activeNode.data } },
                  'navbar-start': { data: { activeNode: layout.activeNode, popoverAnchorId: layout.popoverAnchorId } },
                  'navbar-end': { data: { object: layout.activeNode.data } },
                  status: { data: { active: layout.activeNode.data } },
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
                documentTitle: { data: { component: `${LAYOUT_PLUGIN}/DocumentTitle` } },
              },
            };

        return (
          <>
            <Surface {...surfaceProps} />
            <Mosaic.DragOverlay />
          </>
        );
      },
      surface: {
        component: ({ data, role }) => {
          switch (data.component) {
            case `${LAYOUT_PLUGIN}/MainLayout`:
              return (
                <MainLayout
                  showHintsFooter={state.values.showFooter}
                  fullscreen={state.values.fullscreen}
                  showComplementarySidebar={state.values.enableComplementarySidebar}
                />
              );

            case `${LAYOUT_PLUGIN}/ContentEmpty`:
              return <ContentEmpty />;

            case `${LAYOUT_PLUGIN}/ContextView`:
              return <ContextPanel />;
          }

          switch (role) {
            case 'settings':
              return data.plugin === meta.id ? <LayoutSettings settings={state.values} /> : null;
          }

          return null;
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
              const id = (intent.data as LayoutAction.Activate).id;
              const path = graphPlugin?.provides.graph.getPath(id);
              if (path) {
                Keyboard.singleton.setCurrentContext(path.join('/'));
              }

              batch(() => {
                state.values.previous = state.values.active;
                state.values.active = id;
              });
              return true;
            }
          }
        },
      },
    },
  };
};
