//
// Copyright 2023 DXOS.org
//

import { ArrowsOut } from '@phosphor-icons/react';
import { batch } from '@preact/signals-react';
import { type RevertDeepSignal } from 'deepsignal';
import React, { type PropsWithChildren, useEffect } from 'react';

import { useGraph } from '@braneframe/plugin-graph';
import {
  type Plugin,
  type PluginDefinition,
  Surface,
  findPlugin,
  resolvePlugin,
  useIntent,
  usePlugins,
  type LayoutProvides,
  type IntentResolverProvides,
  parseGraphPlugin,
  parseIntentPlugin,
  type TranslationsProvides,
  type GraphPluginProvides,
  type GraphBuilderProvides,
  parseSurfacePlugin,
  type SurfaceProvides,
} from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { LocalStorageStore } from '@dxos/local-storage';

import { LayoutContext, useLayout } from './LayoutContext';
import { Fallback, SplitView, ContextView, ContentEmpty } from './components';
import { activeToUri, uriToActive } from './helpers';
import translations from './translations';
import { LAYOUT_PLUGIN, LayoutAction, type LayoutState } from './types';

/**
 * Root application layout that controls sidebars, popovers, and dialogs.
 */
export type LayoutPluginOptions = {
  showComplementarySidebar?: boolean;
};

export type LayoutPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  TranslationsProvides &
  LayoutProvides;

export const LayoutPlugin = (options?: LayoutPluginOptions): PluginDefinition<LayoutPluginProvides> => {
  let graphPlugin: Plugin<GraphPluginProvides> | undefined;
  const { showComplementarySidebar = false } = { ...options };

  const state = new LocalStorageStore<LayoutState>(LAYOUT_PLUGIN, {
    fullscreen: false,
    sidebarOpen: true,
    complementarySidebarOpen: false,

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
    meta: {
      id: LAYOUT_PLUGIN,
    },
    ready: async (plugins) => {
      graphPlugin = resolvePlugin(plugins, parseGraphPlugin);

      state
        .prop(state.values.$sidebarOpen!, 'sidebar-open', LocalStorageStore.bool)
        .prop(state.values.$complementarySidebarOpen!, 'complementary-sidebar-open', LocalStorageStore.bool);
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
        <LayoutContext.Provider value={state.values as RevertDeepSignal<LayoutState>}>
          {props.children}
        </LayoutContext.Provider>
      ),
      root: () => {
        const { plugins } = usePlugins();
        const { dispatch } = useIntent();
        const { graph } = useGraph();
        const layout = useLayout();
        const [shortId, $component] = layout.active?.split(':') ?? [];
        const plugin = parseSurfacePlugin(findPlugin(plugins, shortId));
        const result = plugin?.provides.surface.component({ $component });

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

        if (result) {
          return <>result</>;
        } else if (layout.activeNode) {
          if (state.values.fullscreen) {
            return (
              <Surface
                data={{
                  $component: `${LAYOUT_PLUGIN}/SplitView`,
                  $surfaces: {
                    main: { data: layout.activeNode.data, fallback: Fallback },
                  },
                }}
              />
            );
          }

          return (
            <Surface
              data={{
                $component: `${LAYOUT_PLUGIN}/SplitView`,
                $surfaces: {
                  sidebar: {
                    data: { graph, activeId: layout.active, popoverAnchorId: layout.popoverAnchorId },
                  },
                  complementary: {
                    data: { $component: `${LAYOUT_PLUGIN}/ContextView`, active: layout.activeNode.data },
                  },
                  main: { data: { active: layout.activeNode.data }, fallback: Fallback },
                  presence: { data: { active: layout.activeNode.data } },
                  status: { data: { active: layout.activeNode.data } },
                  heading: { data: { activeNode: layout.activeNode } },
                  documentTitle: { data: { activeNode: layout.activeNode } },
                },
              }}
            />
          );
        } else {
          return (
            <Surface
              data={{
                $component: `${LAYOUT_PLUGIN}/SplitView`,
                $surfaces: {
                  sidebar: {
                    data: { graph, activeId: layout.active, popoverAnchorId: layout.popoverAnchorId },
                  },
                  main: { data: { $component: `${LAYOUT_PLUGIN}/ContentEmpty` } },
                  // TODO(wittjosiah): This plugin should own document title.
                  documentTitle: { data: { $component: 'dxos.org/plugin/treeview/DocumentTitle' } },
                },
              }}
            />
          );
        }
      },
      surface: {
        component: ({ $component }) => {
          switch ($component) {
            case `${LAYOUT_PLUGIN}/SplitView`:
              return (
                <SplitView fullscreen={state.values.fullscreen} showComplementarySidebar={showComplementarySidebar} />
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
            case LayoutAction.TOGGLE_FULLSCREEN: {
              state.values.fullscreen = intent.data?.state ?? !state.values.fullscreen;
              return true;
            }

            case LayoutAction.TOGGLE_SIDEBAR: {
              state.values.sidebarOpen = intent.data?.state ?? !state.values.sidebarOpen;
              return true;
            }

            case LayoutAction.OPEN_DIALOG: {
              state.values.dialogOpen = true;
              state.values.dialogContent = intent.data.content;
              return true;
            }

            case LayoutAction.CLOSE_DIALOG: {
              state.values.dialogOpen = false;
              state.values.dialogContent = null;
              return true;
            }

            case LayoutAction.ACTIVATE: {
              if (intent.data && typeof intent.data.id === 'string') {
                batch(() => {
                  state.values.previous = state.values.active;
                  state.values.active = intent.data.id;
                });
                return true;
              }
              break;
            }
          }
        },
      },
    },
  };
};
