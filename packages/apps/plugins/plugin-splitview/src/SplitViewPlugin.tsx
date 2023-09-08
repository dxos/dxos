//
// Copyright 2023 DXOS.org
//

import { ArrowLineLeft } from '@phosphor-icons/react';
import React, { PropsWithChildren } from 'react';

import { LocalStorageStore } from '@dxos/local-storage';
import { PluginDefinition } from '@dxos/react-surface';

import { SplitViewContext } from './SplitViewContext';
import { SplitView, SplitViewMainContentEmpty } from './components';
import translations from './translations';
import { SPLITVIEW_PLUGIN, SplitViewAction, SplitViewProvides, SplitViewState } from './types';

/**
 * Root application layout that controls sidebars, popovers, and dialogs.
 */
export type SplitViewPluginOptions = {
  showComplementarySidebar?: boolean;
};

export const SplitViewPlugin = (options?: SplitViewPluginOptions): PluginDefinition<SplitViewProvides> => {
  const { showComplementarySidebar = true } = { ...options };
  const settings = new LocalStorageStore<SplitViewState>('braneframe.plugin-splitview', {
    sidebarOpen: true,
    dialogContent: 'never',
    dialogOpen: false,
  });

  return {
    meta: {
      id: SPLITVIEW_PLUGIN,
    },
    ready: async () => {
      settings
        .prop(settings.values.$sidebarOpen!, 'sidebar-open', LocalStorageStore.bool)
        .prop(settings.values.$complementarySidebarOpen!, 'complementary-sidebar-open', LocalStorageStore.bool);
    },
    unload: async () => {
      settings.close();
    },
    provides: {
      context: (props: PropsWithChildren) => (
        <SplitViewContext.Provider value={settings.values}>{props.children}</SplitViewContext.Provider>
      ),
      components: { SplitView: () => <SplitView {...{ showComplementarySidebar }} />, SplitViewMainContentEmpty },
      graph: {
        nodes: (parent) => {
          if (parent.id !== 'root') {
            return;
          }
          parent.addAction({
            id: 'close-sidebar',
            label: ['close sidebar label', { ns: 'os' }],
            icon: (props) => <ArrowLineLeft {...props} />,
            intent: {
              plugin: SPLITVIEW_PLUGIN,
              action: SplitViewAction.TOGGLE_SIDEBAR,
              data: { state: false },
            },
          });
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case SplitViewAction.TOGGLE_SIDEBAR: {
              settings.values.sidebarOpen = intent.data.state ?? !settings.values.sidebarOpen;
              return true;
            }
          }
        },
      },
      splitView: settings.values,
      translations,
    },
  };
};
