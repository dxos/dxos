//
// Copyright 2023 DXOS.org
//

import React, { PropsWithChildren, createContext, useContext } from 'react';

import { Surface, definePlugin } from '../framework';
import { RouterPluginProvides } from './RoutesPlugin';

export type SplitViewProps = {};

const Context = createContext({
  sidebarOpen: false,
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

export const SplitViewPlugin = definePlugin<RouterPluginProvides>({
  meta: {
    id: 'dxos:SplitViewPlugin',
  },
  provides: {
    router: {
      routes: () => [
        {
          path: '/',
          element: (
            <Surface
              component='dxos:SplitViewPlugin/SplitView'
              surfaces={{ sidebar: { component: 'dxos:ListViewPlugin/ListView' } }}
            />
          ),
        },
      ],
    },
    context: (props: PropsWithChildren) => (
      <Context.Provider value={{ sidebarOpen: true }}>{props.children}</Context.Provider>
    ),
    components: { SplitView },
  },
});
