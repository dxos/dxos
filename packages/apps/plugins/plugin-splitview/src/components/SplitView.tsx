//
// Copyright 2023 DXOS.org
//

import { Sidebar as SidebarIcon } from '@phosphor-icons/react';
import React from 'react';

import { Button, Main, Dialog, useTranslation, DensityProvider } from '@dxos/aurora';
import { fineBlockSize, getSize, mx } from '@dxos/aurora-theme';
import { observer } from '@dxos/observable-object/react';
import { Surface } from '@dxos/react-surface';

import { useSplitView } from '../SplitViewContext';

export const SplitView = observer(() => {
  const context = useSplitView();
  const { sidebarOpen, dialogOpen, dialogContent } = context;
  const { t } = useTranslation('os');

  return (
    <Main.Root sidebarOpen={context.sidebarOpen} onSidebarOpenChange={(next) => (context.sidebarOpen = next)}>
      <Main.Sidebar>
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
            {dialogContent === 'dxos:splitview/ProfileSettings' ? (
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
