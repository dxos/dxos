//
// Copyright 2023 DXOS.org
//

import { Sidebar as SidebarIcon } from '@phosphor-icons/react';
import React, { PropsWithChildren, createContext, useContext } from 'react';

import { Button, Main } from '@dxos/aurora';
import { fineBlockSize, getSize, mx } from '@dxos/aurora-theme';
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
    <Main.Root sidebarOpen={context.sidebarOpen} onSidebarOpenChange={(next) => (context.sidebarOpen = next)}>
      <Main.Sidebar swipeToDismiss>
        <Surface name='sidebar' />
      </Main.Sidebar>
      <div
        role='none'
        className={mx(
          'fixed z-[1] block-end-0 pointer-fine:block-end-auto pointer-fine:block-start-0 p-2 transition-[inset-inline-start,opacity] ease-in-out duration-200 inline-start-0',
          sidebarOpen && 'opacity-0 pointer-events-none',
        )}
      >
        <Button
          onClick={() => (context.sidebarOpen = !context.sidebarOpen)}
          classNames={mx(fineBlockSize, 'aspect-square p-0')}
        >
          <SidebarIcon weight='light' className={getSize(5)} />
        </Button>
      </div>
      <Main.Overlay />
      <Surface name='main' />
    </Main.Root>
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
