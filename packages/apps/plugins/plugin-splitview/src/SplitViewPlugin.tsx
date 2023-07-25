//
// Copyright 2023 DXOS.org
//

import { ArrowLineLeft } from '@phosphor-icons/react';
import { deepSignal } from 'deepsignal/react';
import React, { PropsWithChildren } from 'react';

import { PluginDefinition } from '@dxos/react-surface';

import { SplitViewContext } from './SplitViewContext';
import { SplitView, SplitViewMainContentEmpty } from './components';
import { SPLITVIEW_PLUGIN, SplitViewAction, SplitViewProvides } from './types';

export const SplitViewPlugin = (): PluginDefinition<SplitViewProvides> => {
  const state = deepSignal({
    sidebarOpen: true,
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
      graph: {
        actions: (parent) => {
          if (parent.id !== 'root') {
            return [];
          }

          return [
            {
              id: 'close-sidebar',
              index: 'a1',
              label: ['close sidebar label', { ns: 'os' }],
              icon: (props) => <ArrowLineLeft {...props} />,
              intent: {
                plugin: SPLITVIEW_PLUGIN,
                action: SplitViewAction.TOGGLE_SIDEBAR,
                data: { state: false },
              },
            },
          ];
        },
      },
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
    },
  };
};
