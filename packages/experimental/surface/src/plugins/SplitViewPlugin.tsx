//
// Copyright 2023 DXOS.org
//

import React, { PropsWithChildren, createContext, useContext } from 'react';

import { createStore } from '@dxos/observable-object';
import { observer } from '@dxos/observable-object/react';

import { Surface, definePlugin } from '../framework';
import { RouterPluginProvides } from './RoutesPlugin';

export type SplitViewProps = {};

const store = createStore({
  sidebarOpen: true,
});

const Context = createContext(store);

export const useSplitViewContext = () => useContext(Context);

export const SplitView = observer(() => {
  const context = useSplitViewContext();
  const { sidebarOpen } = context;

  return (
    <div>
      {sidebarOpen ? <Surface name='sidebar' /> : null}
      <button
        onClick={() => {
          context.sidebarOpen = !sidebarOpen;
        }}
      >
        Toggle
      </button>
      <Surface name='main' />
    </div>
  );
});

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
    context: (props: PropsWithChildren) => <Context.Provider value={store}>{props.children}</Context.Provider>,
    components: { SplitView },
  },
});
