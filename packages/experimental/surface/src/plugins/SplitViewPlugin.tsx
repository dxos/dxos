//
// Copyright 2023 DXOS.org
//

import React, { PropsWithChildren, createContext, useContext } from 'react';

import { Surface, definePlugin, usePluginContext } from '../framework';

import { RouterActions } from '../Actions';

export type SplitViewProps = {};

const Context = createContext({
  sidebarOpen: false
});

export const useSplitViewContext = () => useContext(Context);

export const SplitView = (props: SplitViewProps) => {
  const { sidebarOpen } = useSplitViewContext();
  const { dispatch } = usePluginContext();
  return (
    <div>
      {sidebarOpen ? <Surface name='sidebar' /> : null}
      <Surface name='main' />
      <button onClick={() => dispatch({ type: 'navigate', to: '/foo' })}>Navigate to foo</button>
    </div>
  );
};

export const SplitViewPlugin = definePlugin({
  meta: {
    id: 'SplitViewPlugin'
  },
  provides: {
    context: (props: PropsWithChildren) => (
      <Context.Provider value={{ sidebarOpen: false }}>{props.children}</Context.Provider>
    ),
    components: { SplitView }
  }
});
