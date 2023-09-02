//
// Copyright 2023 DXOS.org
//

import { ArrowLineLeft } from '@phosphor-icons/react';
import { deepSignal } from 'deepsignal/react';
import React, { PropsWithChildren } from 'react';

import { LocalStorageStore } from '@dxos/local-storage';
import { PluginDefinition } from '@dxos/react-surface';

import { SplitViewContext } from './SplitViewContext';
import { SplitView, SplitViewMainContentEmpty } from './components';
import translations from './translations';
import { SPLITVIEW_PLUGIN, SplitViewAction, SplitViewProvides, SplitViewState } from './types';

export type SplitViewPluginConfig = Partial<{
  enableComplementarySidebar: boolean;
}>;

/**
 * Root application layout that controls sidebars, popovers, and dialogs.
 */
export const SplitViewPlugin = ({
  enableComplementarySidebar,
}: SplitViewPluginConfig = {}): PluginDefinition<SplitViewProvides> => {
  const settings = new LocalStorageStore<SplitViewState>(
    deepSignal({
      dialogContent: 'never',
      dialogOpen: false,
    }),
  );

  // const state = deepSignal({
  // TODO(burdon): Proxy.
  // sidebarOpen: settings.values.$sidebarOpen,
  // complementarySidebarOpen: settings.values.$complementarySidebarOpen,
  // sidebarOpen: true,
  // complementarySidebarOpen: enableComplementarySidebar ? false : undefined, // TODO(burdon): Store state in local storage.
  // dialogContent: 'never',
  // dialogOpen: false,
  // });

  return {
    meta: {
      id: SPLITVIEW_PLUGIN,
    },
    ready: async () => {
      settings
        .bind(settings.values.$sidebarOpen!, 'braneframe.plugin-splitview.sidebarOpen', LocalStorageStore.bool)
        .bind(
          settings.values.$complementarySidebarOpen!,
          'braneframe.plugin-splitview.complementarySidebarOpen',
          LocalStorageStore.bool,
        );
    },
    unload: async () => {
      settings.close();
    },
    provides: {
      context: (props: PropsWithChildren) => (
        <SplitViewContext.Provider value={settings.values}>{props.children}</SplitViewContext.Provider>
      ),
      components: { SplitView, SplitViewMainContentEmpty },
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
