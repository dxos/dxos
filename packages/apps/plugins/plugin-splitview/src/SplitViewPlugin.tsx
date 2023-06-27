//
// Copyright 2023 DXOS.org
//

import React, { PropsWithChildren } from 'react';

import { createStore } from '@dxos/observable-object';
import { PluginDefinition } from '@dxos/react-surface';

import { defaultValues, SplitViewContext, SplitViewContextValue } from './SplitViewContext';
import { SplitView, SplitViewMainContentEmpty } from './components';

export type SplitViewProvides = {
  splitView: SplitViewContextValue;
};

export const SplitViewPlugin = (): PluginDefinition<SplitViewProvides> => {
  const store = createStore(defaultValues);

  return {
    meta: {
      id: 'dxos:SplitViewPlugin',
    },
    provides: {
      context: (props: PropsWithChildren) => (
        <SplitViewContext.Provider value={store}>{props.children}</SplitViewContext.Provider>
      ),
      components: { SplitView, SplitViewMainContentEmpty },
      splitView: store,
    },
  };
};
