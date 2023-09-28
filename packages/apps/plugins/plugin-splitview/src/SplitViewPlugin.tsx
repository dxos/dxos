//
// Copyright 2023 DXOS.org
//

import { batch } from '@preact/signals-react';
import { RevertDeepSignal } from 'deepsignal';
import React, { PropsWithChildren, useEffect } from 'react';

import { GraphPluginProvides, useGraph } from '@braneframe/plugin-graph';
import { useIntent } from '@braneframe/plugin-intent';
import { LocalStorageStore } from '@dxos/local-storage';
import { Plugin, PluginDefinition, Surface, findPlugin, usePlugins } from '@dxos/react-surface';

import { SplitViewContext, useSplitView } from './SplitViewContext';
import { Fallback, SplitView, SplitViewMainContentEmpty } from './components';
import { activeToUri, uriToActive } from './helpers';
import translations from './translations';
import { SPLITVIEW_PLUGIN, SplitViewAction, SplitViewPluginProvides, SplitViewState } from './types';

/**
 * Root application layout that controls sidebars, popovers, and dialogs.
 */
export type SplitViewPluginOptions = {
  showComplementarySidebar?: boolean;
};

export const SplitViewPlugin = (options?: SplitViewPluginOptions): PluginDefinition<SplitViewPluginProvides> => {
  let graphPlugin: Plugin<GraphPluginProvides> | undefined;
  const { showComplementarySidebar = false } = { ...options };
  const settings = new LocalStorageStore<SplitViewState>('braneframe.plugin-splitview', {
    sidebarOpen: true,
    dialogContent: 'never',
    dialogOpen: false,
    active: undefined,
    previous: undefined,
    get activeNode() {
      if (!graphPlugin) {
        throw new Error('Graph plugin not found.');
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

      settings
        .prop(settings.values.$sidebarOpen!, 'sidebar-open', LocalStorageStore.bool)
        .prop(settings.values.$complementarySidebarOpen!, 'complementary-sidebar-open', LocalStorageStore.bool);
    },
    unload: async () => {
      settings.close();
    },
    provides: {
      context: (props: PropsWithChildren) => (
        <SplitViewContext.Provider value={settings.values as RevertDeepSignal<SplitViewState>}>
          {props.children}
        </SplitViewContext.Provider>
      ),
      components: {
        SplitView: () => <SplitView {...{ showComplementarySidebar }} />,
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

            if (!settings.values.active && window.location.pathname.length > 1) {
              void handleNavigation();
            }

            window.addEventListener('popstate', handleNavigation);
            return () => {
              window.removeEventListener('popstate', handleNavigation);
            };
          }, []);

          // Update URL when selection changes.
          useEffect(() => {
            const selectedPath = activeToUri(settings.values.active);
            if (window.location.pathname !== selectedPath) {
              // TODO(wittjosiah): Better support for search params?
              history.pushState(null, '', `${selectedPath}${window.location.search}`);
            }
          }, [settings.values.active]);

          if (plugin && plugin.provides.components?.[component]) {
            return <Surface component={`${plugin.meta.id}/${component}`} />;
          } else if (splitView.activeNode) {
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
            case SplitViewAction.TOGGLE_SIDEBAR: {
              settings.values.sidebarOpen = intent.data.state ?? !settings.values.sidebarOpen;
              return true;
            }

            case SplitViewAction.OPEN_DIALOG: {
              settings.values.dialogOpen = true;
              settings.values.dialogContent = intent.data.content;
              return true;
            }

            case SplitViewAction.CLOSE_DIALOG: {
              settings.values.dialogOpen = false;
              settings.values.dialogContent = null;
              return true;
            }

            case SplitViewAction.ACTIVATE: {
              if (intent.data && typeof intent.data.id === 'string') {
                batch(() => {
                  settings.values.previous = settings.values.active;
                  settings.values.active = intent.data.id;
                });
                return true;
              }
              break;
            }
          }
        },
      },
      splitView: settings.values as RevertDeepSignal<SplitViewState>,
      translations,
    },
  };
};
