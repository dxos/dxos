//
// Copyright 2023 DXOS.org
//

import { Sidebar as SidebarIcon } from '@phosphor-icons/react';
import React, { PropsWithChildren, createContext, useContext } from 'react';

import { Button, Main, Dialog, useTranslation, DensityProvider } from '@dxos/aurora';
import { defaultDescription, fineBlockSize, getSize, mx } from '@dxos/aurora-theme';
import { createStore } from '@dxos/observable-object';
import { observer } from '@dxos/observable-object/react';

import { Surface, definePlugin } from '../framework';
import { RouterPluginProvides } from './RoutesPlugin';

export type SplitViewContextValue = {
  sidebarOpen: boolean;
  dialogContent: any;
  dialogOpen: boolean;
};

const store = createStore<SplitViewContextValue>({
  sidebarOpen: true,
  dialogContent: 'never',
  dialogOpen: false,
});

const Context = createContext(store);

export const useSplitViewContext = () => useContext(Context);

export const SplitView = observer(() => {
  const context = useSplitViewContext();
  const { sidebarOpen, dialogOpen, dialogContent } = context;
  const { t } = useTranslation('os');

  return (
    <Main.Root sidebarOpen={context.sidebarOpen} onSidebarOpenChange={(next) => (context.sidebarOpen = next)}>
      <Main.Sidebar swipeToDismiss>
        <Surface name='sidebar' />
      </Main.Sidebar>
      <div
        role='none'
        className={mx(
          'fixed z-[1] block-end-0 pointer-fine:block-end-auto pointer-fine:block-start-0 p-2 pointer-fine:p-1.5 transition-[inset-inline-start,opacity] ease-in-out duration-200 inline-start-0',
          sidebarOpen && 'opacity-0 pointer-events-none',
        )}
      >
        <Button
          onClick={() => (context.sidebarOpen = !context.sidebarOpen)}
          classNames={mx(fineBlockSize, 'aspect-square p-0 shadow-none')}
        >
          <SidebarIcon weight='light' className={getSize(5)} />
        </Button>
      </div>
      <Main.Overlay />
      <Surface name='main' />
      <Dialog.Root open={dialogOpen} onOpenChange={(nextOpen) => (context.dialogOpen = nextOpen)}>
        <DensityProvider density='fine'>
          <Dialog.Overlay>
            {dialogContent === 'dxos:SplitViewPlugin/ProfileSettings' ? (
              <Dialog.Content>
                <Dialog.Title>{t('settings dialog title', { ns: 'os' })}</Dialog.Title>
                <Surface role='dialog' data={dialogContent} />
                <Dialog.Close asChild>
                  <Button variant='primary' classNames='mbs-2'>
                    {t('done label', { ns: 'os' })}
                  </Button>
                </Dialog.Close>
              </Dialog.Content>
            ) : (
              <Dialog.Content>
                <Surface role='dialog' data={dialogContent} />
              </Dialog.Content>
            )}
          </Dialog.Overlay>
        </DensityProvider>
      </Dialog.Root>
    </Main.Root>
  );
});

export type SplitViewProvides = {
  splitView: SplitViewContextValue;
};

export const SplitViewMainContentEmpty = () => {
  const { t } = useTranslation('composer');
  return (
    <div role='none' className='min-bs-screen is-full flex items-center justify-center p-8'>
      <p
        role='alert'
        className={mx(
          defaultDescription,
          'border border-dashed border-neutral-400/50 rounded-xl flex items-center justify-center p-8 font-system-normal text-lg',
        )}
      >
        {t('first run message')}
      </p>
    </div>
  );
};

export const SplitViewPlugin = definePlugin<RouterPluginProvides & SplitViewProvides>({
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
              surfaces={{
                sidebar: { component: 'dxos:TreeViewPlugin/TreeView' },
                main: { component: 'dxos:SplitViewPlugin/SplitViewMainContentEmpty' },
              }}
            />
          ),
        },
      ],
    },
    context: (props: PropsWithChildren) => <Context.Provider value={store}>{props.children}</Context.Provider>,
    components: { SplitView, SplitViewMainContentEmpty },
    splitView: store,
  },
});
