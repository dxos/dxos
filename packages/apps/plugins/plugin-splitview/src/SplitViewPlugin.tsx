//
// Copyright 2023 DXOS.org
//

import { ArrowsOut } from '@phosphor-icons/react';
import { batch } from '@preact/signals-react';
import { type RevertDeepSignal } from 'deepsignal';
import React, { type PropsWithChildren, useEffect } from 'react';

import { type GraphPluginProvides, useGraph } from '@braneframe/plugin-graph';
import { useIntent } from '@braneframe/plugin-intent';
import { LocalStorageStore } from '@dxos/local-storage';
import { type Plugin, type PluginDefinition, Surface, findPlugin, usePlugins } from '@dxos/react-surface';

import { SplitViewContext, useSplitView } from './SplitViewContext';
import { Fallback, SplitView, SplitViewMainContentEmpty } from './components';
import { activeToUri, uriToActive } from './helpers';
import translations from './translations';
import { SPLITVIEW_PLUGIN, SplitViewAction, type SplitViewPluginProvides, type SplitViewState } from './types';

/**
 * Root application layout that controls sidebars, popovers, and dialogs.
 */
export type SplitViewPluginOptions = {
  showComplementarySidebar?: boolean;
};

// TODO(burdon): Rename LayoutPlugin.
export const SplitViewPlugin = (options?: SplitViewPluginOptions): PluginDefinition<SplitViewPluginProvides> => {
  let graphPlugin: Plugin<GraphPluginProvides> | undefined;
  const { showComplementarySidebar = false } = { ...options };

  // TODO(burdon): Rename state.
  const state = new LocalStorageStore<SplitViewState>('braneframe.plugin-splitview', {
    fullscreen: false,
    sidebarOpen: true,
    dialogContent: 'never',
    dialogOpen: false,
    active: undefined,
    previous: undefined,

    get activeNode() {
      if (!graphPlugin) {
        throw new Error('Graph plugin not found.'); // TODO(burdon): Replace with invariant throughout?
      }

      return this.active && graphPlugin.provides.graph().findNode(this.active);
    },
    get previousNode() {
      if (!graphPlugin) {
        throw new Error('Graph plugin not found.');
      }

      return this.previous && graphPlugin.provides.graph().findNode(this.previous);
    },
  });

  return {
    meta: {
      id: SPLITVIEW_PLUGIN,
    },
    ready: async (plugins) => {
      graphPlugin = findPlugin<GraphPluginProvides>(plugins, 'dxos.org/plugin/graph');

      state
        .prop(state.values.$sidebarOpen!, 'sidebar-open', LocalStorageStore.bool)
        .prop(state.values.$complementarySidebarOpen!, 'complementary-sidebar-open', LocalStorageStore.bool);
    },
    unload: async () => {
      state.close();
    },
    provides: {
      // TODO(burdon): Should provides keys be indexed by plugin id (i.e., FQ)?
      graph: {
        nodes: (parent) => {
          if (parent.id === 'root') {
            // TODO(burdon): Root menu isn't visible so nothing bound.
            parent.addAction({
              id: SplitViewAction.TOGGLE_FULLSCREEN,
              label: ['toggle fullscreen label', { ns: SPLITVIEW_PLUGIN }],
              icon: (props) => <ArrowsOut {...props} />,
              intent: {
                plugin: SPLITVIEW_PLUGIN,
                action: 'toggle-fullscreen',
              },
              keyBinding: 'ctrl+meta+f',
            });
          }
        },
      },
      context: (props: PropsWithChildren) => (
        <SplitViewContext.Provider value={state.values as RevertDeepSignal<SplitViewState>}>
          {props.children}
        </SplitViewContext.Provider>
      ),
      components: {
        SplitView: () => <SplitView fullscreen={state.values.fullscreen} {...{ showComplementarySidebar }} />,
        SplitViewMainContentEmpty,
        default: () => {
          const { plugins } = usePlugins();
          const { dispatch } = useIntent();
          const { graph } = useGraph();
          const splitView = useSplitView();
          const [shortId, component] = splitView.active?.split(':') ?? [];
          const plugin = findPlugin(plugins, shortId);

          // Update selection based on browser navigation.
          useEffect(() => {
            const handleNavigation = async () => {
              await dispatch({
                plugin: SPLITVIEW_PLUGIN,
                action: SplitViewAction.ACTIVATE,
                data: {
                  // TODO(wittjosiah): Remove condition. This is here for backwards compatibility.
                  id:
                    window.location.pathname === '/embedded'
                      ? 'github:embedded'
                      : uriToActive(window.location.pathname),
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

          if (plugin && plugin.provides.components?.[component]) {
            return <Surface component={`${plugin.meta.id}/${component}`} />;
          } else if (splitView.activeNode) {
            if (state.values.fullscreen) {
              return (
                <Surface
                  component='dxos.org/plugin/splitview/SplitView'
                  surfaces={{
                    main: { data: splitView.activeNode.data, fallback: Fallback },
                  }}
                />
              );
            }

            return (
              <Surface
                component='dxos.org/plugin/splitview/SplitView'
                surfaces={{
                  sidebar: {
                    data: { graph, activeId: splitView.active, popoverAnchorId: splitView.popoverAnchorId },
                  },
                  complementary: { data: splitView.activeNode.data },
                  main: { data: splitView.activeNode.data, fallback: Fallback },
                  presence: { data: splitView.activeNode.data },
                  status: { data: splitView.activeNode.data },
                  heading: { data: splitView.activeNode },
                  documentTitle: { data: splitView.activeNode },
                }}
              />
            );
          } else {
            return (
              <Surface
                component='dxos.org/plugin/splitview/SplitView'
                surfaces={{
                  sidebar: {
                    data: { graph, activeId: splitView.active, popoverAnchorId: splitView.popoverAnchorId },
                  },
                  main: { component: 'dxos.org/plugin/splitview/SplitViewMainContentEmpty' },
                  documentTitle: { component: 'dxos.org/plugin/treeview/DocumentTitle' },
                }}
              />
            );
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
      splitView: state.values as RevertDeepSignal<SplitViewState>,
      translations,
    },
  };
};
