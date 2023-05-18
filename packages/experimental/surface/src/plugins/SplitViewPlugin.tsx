//
// Copyright 2023 DXOS.org
//

import React, { PropsWithChildren, createContext, useContext } from 'react';

import { Surface, definePlugin } from '../framework';

export type SplitViewProps = {};

const Context = createContext({
  sidebarOpen: false
});

export const useSplitViewContext = () => useContext(Context);

export const SplitView = (props: SplitViewProps) => {
  const { sidebarOpen } = useSplitViewContext();
  return (
    <div>
      {sidebarOpen ? <Surface name='sidebar' /> : null}
      <Surface name='main' />
    </div>
  );
};

export const SplitViewPlugin = definePlugin({
  meta: {
    id: 'dxos:SplitViewPlugin'
  },
  provides: {
    context: (props: PropsWithChildren) => (
      <Context.Provider value={{ sidebarOpen: true }}>{props.children}</Context.Provider>
    ),
    components: { SplitView }
  }
});
