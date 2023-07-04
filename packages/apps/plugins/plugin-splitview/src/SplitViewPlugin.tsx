//
// Copyright 2023 DXOS.org
//

import { ArrowLineLeft } from '@phosphor-icons/react';
import React, { PropsWithChildren } from 'react';

import { GraphProvides } from '@braneframe/plugin-graph';
import { createStore } from '@dxos/observable-object';
import { PluginDefinition } from '@dxos/react-surface';

import { defaultValues, SplitViewContext, SplitViewContextValue } from './SplitViewContext';
import { SplitView, SplitViewMainContentEmpty } from './components';

export type SplitViewProvides = GraphProvides & {
  splitView: SplitViewContextValue;
};

export const SplitViewPlugin = (): PluginDefinition<SplitViewProvides> => {
  const store = createStore(defaultValues);

  return {
    meta: {
      id: 'dxos:splitview',
    },
    provides: {
      context: (props: PropsWithChildren) => (
        <SplitViewContext.Provider value={store}>{props.children}</SplitViewContext.Provider>
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
              label: ['close sidebar label', { ns: 'os' }],
              icon: (props) => <ArrowLineLeft {...props} />,
              invoke: async () => {
                store.sidebarOpen = false;
              },
            },
          ];
        },
      },
      splitView: store,
    },
  };
};
