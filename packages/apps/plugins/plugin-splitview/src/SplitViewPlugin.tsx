//
// Copyright 2023 DXOS.org
//

import { ArrowsOut } from '@phosphor-icons/react';
import { batch } from '@preact/signals-react';
import { type RevertDeepSignal } from 'deepsignal';
import React, { type PropsWithChildren, useEffect } from 'react';

import { useGraph } from '@braneframe/plugin-graph';
import { invariant } from '@dxos/invariant';
import { LocalStorageStore } from '@dxos/local-storage';
import {
  type Plugin,
  type PluginDefinition,
  Surface,
  findPlugin,
  resolvePlugin,
  useIntent,
  usePlugins,
  type LayoutPluginProvides,
  type IntentResolverProvides,
  parseGraphPlugin,
  parseIntentPlugin,
  type TranslationsProvides,
  type GraphPluginProvides,
  type GraphBuilderProvides,
  parseSurfacePlugin,
  type SurfaceProvides,
} from '@dxos/react-surface';

import { SplitViewContext, useSplitView } from './SplitViewContext';
import { Fallback, SplitView, ContextView, ContentEmpty } from './components';
import { activeToUri, uriToActive } from './helpers';
import translations from './translations';
import { SPLITVIEW_PLUGIN, SplitViewAction, type LayoutState } from './types';

/**
 * Root application layout that controls sidebars, popovers, and dialogs.
 */
export type SplitViewPluginOptions = {
  showComplementarySidebar?: boolean;
};

export type SplitViewPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  TranslationsProvides &
  LayoutPluginProvides;

// TODO(burdon): Rename LayoutPlugin.
export const SplitViewPlugin = (options?: SplitViewPluginOptions): PluginDefinition<SplitViewPluginProvides> => {
  let graphPlugin: Plugin<GraphPluginProvides> | undefined;
  const { showComplementarySidebar = false } = { ...options };

  const state = new LocalStorageStore<LayoutState>(SPLITVIEW_PLUGIN, {
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
      id: SPLITVIEW_PLUGIN,
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
              id: SplitViewAction.TOGGLE_FULLSCREEN,
              label: ['toggle fullscreen label', { ns: SPLITVIEW_PLUGIN }],
              icon: (props) => <ArrowsOut {...props} />,
              invoke: () =>
                intentPlugin?.provides.intent.dispatch({
                  plugin: SPLITVIEW_PLUGIN,
                  action: 'toggle-fullscreen',
                }),
              keyBinding: 'ctrl+meta+f',
            });
          }
        },
      },
      context: (props: PropsWithChildren) => (
        <SplitViewContext.Provider value={state.values as RevertDeepSignal<LayoutState>}>
          {props.children}
        </SplitViewContext.Provider>
      ),
      root: () => {
        const { plugins } = usePlugins();
        const { dispatch } = useIntent();
        const { graph } = useGraph();
        const splitView = useSplitView();
        const [shortId, $component] = splitView.active?.split(':') ?? [];
        const plugin = parseSurfacePlugin(findPlugin(plugins, shortId));
        const result = plugin?.provides.surface.component({ $component });

        // Update selection based on browser navigation.
        useEffect(() => {
          const handleNavigation = async () => {
            await dispatch({
              plugin: SPLITVIEW_PLUGIN,
              action: SplitViewAction.ACTIVATE,
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
        } else if (splitView.activeNode) {
          if (state.values.fullscreen) {
            return (
              <Surface
                data={{
                  $component: 'dxos.org/plugin/splitview/SplitView',
                  $surfaces: {
                    main: { data: splitView.activeNode.data, fallback: Fallback },
                  },
                }}
              />
            );
          }

          return (
            <Surface
              data={{
                $component: 'dxos.org/plugin/splitview/SplitView',
                $surfaces: {
                  sidebar: {
                    data: { graph, activeId: splitView.active, popoverAnchorId: splitView.popoverAnchorId },
                  },
                  complementary: {
                    data: { $component: 'dxos.org/plugin/splitView/ContextView', active: splitView.activeNode.data },
                  },
                  main: { data: { active: splitView.activeNode.data }, fallback: Fallback },
                  presence: { data: { active: splitView.activeNode.data } },
                  status: { data: { active: splitView.activeNode.data } },
                  heading: { data: { activeNode: splitView.activeNode } },
                  documentTitle: { data: { activeNode: splitView.activeNode } },
                },
              }}
            />
          );
        } else {
          return (
            <Surface
              data={{
                $component: 'dxos.org/plugin/splitview/SplitView',
                $surfaces: {
                  sidebar: {
                    data: { graph, activeId: splitView.active, popoverAnchorId: splitView.popoverAnchorId },
                  },
                  main: { data: { $component: 'dxos.org/plugin/splitview/ContentEmpty' } },
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
            case `${SPLITVIEW_PLUGIN}/SplitView`:
              return (
                <SplitView fullscreen={state.values.fullscreen} showComplementarySidebar={showComplementarySidebar} />
              );

            case `${SPLITVIEW_PLUGIN}/ContentEmpty`:
              return <ContentEmpty />;

            case `${SPLITVIEW_PLUGIN}/ContextView`:
              return <ContextView />;

            default:
              return null;
          }
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case SplitViewAction.TOGGLE_FULLSCREEN: {
              state.values.fullscreen = intent.data?.state ?? !state.values.fullscreen;
              return true;
            }

            case SplitViewAction.TOGGLE_SIDEBAR: {
              state.values.sidebarOpen = intent.data?.state ?? !state.values.sidebarOpen;
              return true;
            }

            case SplitViewAction.OPEN_DIALOG: {
              state.values.dialogOpen = true;
              state.values.dialogContent = intent.data.content;
              return true;
            }

            case SplitViewAction.CLOSE_DIALOG: {
              state.values.dialogOpen = false;
              state.values.dialogContent = null;
              return true;
            }

            case SplitViewAction.ACTIVATE: {
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
