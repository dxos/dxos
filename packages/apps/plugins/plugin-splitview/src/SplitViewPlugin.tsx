//
// Copyright 2023 DXOS.org
//

import { deepSignal } from 'deepsignal/react';
import React, { PropsWithChildren } from 'react';

import { PluginDefinition } from '@dxos/react-surface';

import { SplitViewContext } from './SplitViewContext';
import { SplitView, SplitViewMainContentEmpty } from './components';
import translations from './translations';
import { SPLITVIEW_PLUGIN, SplitViewAction, SplitViewProvides } from './types';

export type SplitViewPluginConfig = Partial<{
  enableComplementarySidebar: boolean;
}>;

export const SplitViewPlugin = ({
  enableComplementarySidebar,
}: SplitViewPluginConfig = {}): PluginDefinition<SplitViewProvides> => {
  const state = deepSignal({
    sidebarOpen: true,
    complementarySidebarOpen: enableComplementarySidebar ? false : null,
    dialogContent: 'never',
    dialogOpen: false,
  });

  return {
    meta: {
      id: SPLITVIEW_PLUGIN,
    },
    provides: {
      context: (props: PropsWithChildren) => (
        <SplitViewContext.Provider value={state}>{props.children}</SplitViewContext.Provider>
      ),
      components: { SplitView, SplitViewMainContentEmpty },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case SplitViewAction.TOGGLE_SIDEBAR: {
              state.sidebarOpen = intent.data.state ?? !state.sidebarOpen;
              return true;
            }
          }
        },
      },
      splitView: state,
      translations,
    },
  };
};
