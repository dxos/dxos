//
// Copyright 2023 DXOS.org
//

import { ArrowLineLeft } from '@phosphor-icons/react';
import { deepSignal } from 'deepsignal/react';
import React, { PropsWithChildren } from 'react';

import { GraphProvides } from '@braneframe/plugin-graph';
import { PluginDefinition } from '@dxos/react-surface';

import { SplitViewContext, SplitViewContextValue } from './SplitViewContext';
import { SplitView, SplitViewMainContentEmpty } from './components';

export type SplitViewProvides = GraphProvides & {
  splitView: SplitViewContextValue;
};

export const SplitViewPlugin = (): PluginDefinition<SplitViewProvides> => {
  const state = deepSignal({
    sidebarOpen: true,
    dialogContent: 'never',
    dialogOpen: false,
  });

  return {
    meta: {
      id: 'dxos:splitview',
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
              invoke: async () => {
                state.sidebarOpen = false;
              },
            },
          ];
        },
      },
      splitView: state,
    },
  };
};
