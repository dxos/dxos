//
// Copyright 2023 DXOS.org
//

import { Sidebar as SidebarIcon } from '@phosphor-icons/react';
import React from 'react';

import { Button, Main, Dialog, useTranslation, DensityProvider } from '@dxos/aurora';
import { fineBlockSize, getSize, mx } from '@dxos/aurora-theme';
import { Surface } from '@dxos/react-surface';

import { useSplitView } from '../SplitViewContext';
import { SPLITVIEW_PLUGIN } from '../types';

export const SplitView = () => {
  const context = useSplitView();
  const { sidebarOpen, complementarySidebarOpen, dialogOpen, dialogContent } = context;
  const { t } = useTranslation(SPLITVIEW_PLUGIN);

  return (
    <Main.Root
      navigationSidebarOpen={context.sidebarOpen}
      onNavigationSidebarOpenChange={(next) => (context.sidebarOpen = next)}
      {...(complementarySidebarOpen !== null && {
        complementarySidebarOpen: context.complementarySidebarOpen as boolean,
        onComplementarySidebarOpenChange: (next) => (context.complementarySidebarOpen = next),
      })}
    >
      <Main.NavigationSidebar classNames='overflow-hidden'>
        <Surface name='sidebar' />
      </Main.NavigationSidebar>
      {complementarySidebarOpen !== null && (
        <Main.ComplementarySidebar classNames='overflow-hidden'>
          <Surface name='complementary-sidebar' />
        </Main.ComplementarySidebar>
      )}
      <div
        role='none'
        className={mx(
          'fixed z-[1] block-end-0 pointer-fine:block-end-auto pointer-fine:block-start-0 p-4 pointer-fine:p-1.5 transition-[inset-inline-start,opacity] ease-in-out duration-200 inline-start-0',
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
      {complementarySidebarOpen !== null && (
        <div
          role='none'
          className={mx(
            'fixed z-[1] block-end-0 pointer-fine:block-end-auto pointer-fine:block-start-0 p-4 pointer-fine:p-1.5 transition-[inset-inline-start,opacity] ease-in-out duration-200 inline-end-0',
            complementarySidebarOpen && 'opacity-0 pointer-events-none',
          )}
        >
          <Button
            onClick={() => (context.complementarySidebarOpen = !context.complementarySidebarOpen)}
            classNames={mx(fineBlockSize, 'aspect-square p-0 shadow-none')}
          >
            <SidebarIcon mirrored weight='light' className={getSize(5)} />
          </Button>
        </div>
      )}
      <Main.Overlay />
      <Main.Content asChild classNames='fixed inset-inline-0 block-start-0 z-[1] flex'>
        <div role='none' aria-label={t('main header label')}>
          <Surface name='heading' />
          <Surface name='presence' />
        </div>
      </Main.Content>
      <Surface name='main' />
      {/* TODO(burdon): Move dialog to settings-plugin. */}
      <Dialog.Root open={dialogOpen} onOpenChange={(nextOpen) => (context.dialogOpen = nextOpen)}>
        <DensityProvider density='fine'>
          <Dialog.Overlay>
            {dialogContent === 'dxos.org/plugin/splitview/ProfileSettings' ? (
              <Dialog.Content>
                <Dialog.Title>{t('settings dialog title', { ns: 'os' })}</Dialog.Title>
                <div className='flex flex-col my-2 space-y-2'>
                  <Surface role='dialog' data={dialogContent} />
                </div>
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
};
