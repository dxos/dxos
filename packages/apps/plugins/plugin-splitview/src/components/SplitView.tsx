//
// Copyright 2023 DXOS.org
//

import { Chats, List as MenuIcon } from '@phosphor-icons/react';
import React from 'react';

import { Button, Main, Dialog, useTranslation, DensityProvider, Popover } from '@dxos/aurora';
import { coarseBlockSize, fixedSurface, getSize } from '@dxos/aurora-theme';
import { Surface } from '@dxos/react-surface';

import { useSplitView } from '../SplitViewContext';
import { SPLITVIEW_PLUGIN } from '../types';

export const SplitView = () => {
  const context = useSplitView();
  const { complementarySidebarOpen, dialogOpen, dialogContent, popoverOpen, popoverContent, popoverAnchorId } = context;
  const { t } = useTranslation(SPLITVIEW_PLUGIN);

  return (
    <Popover.Root
      open={!!(popoverAnchorId && popoverOpen)}
      onOpenChange={(nextOpen) => {
        if (nextOpen && popoverAnchorId) {
          context.popoverOpen = true;
        } else {
          context.popoverOpen = false;
          context.popoverAnchorId = undefined;
        }
      }}
    >
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
        <Main.Overlay />
        <Main.Content
          asChild
          classNames={['fixed inset-inline-0 block-start-0 z-[1] flex gap-1 plb-1.5', coarseBlockSize, fixedSurface]}
        >
          <div role='none' aria-label={t('main header label')}>
            <DensityProvider density='fine'>
              <Button onClick={() => (context.sidebarOpen = !context.sidebarOpen)} variant='ghost' classNames='mli-1'>
                <span className='sr-only'>{t('open navigation sidebar label')}</span>
                <MenuIcon weight='light' className={getSize(4)} />
              </Button>
              <Surface name='heading' role='heading' limit={2} />
              <div role='none' className='grow' />
              <Surface name='presence' role='presence' limit={1} />
              {complementarySidebarOpen !== null && (
                <Button
                  onClick={() => (context.complementarySidebarOpen = !context.complementarySidebarOpen)}
                  variant='ghost'
                >
                  <span className='sr-only'>{t('open complementary sidebar label')}</span>
                  <Chats weight='light' className={getSize(4)} />
                </Button>
              )}
            </DensityProvider>
          </div>
        </Main.Content>
        <Surface name='main' role='main' />
        <Popover.Portal>
          <Popover.Content
            classNames='z-[60]'
            sideOffset={4}
            collisionPadding={8}
            onEscapeKeyDown={() => {
              context.popoverOpen = false;
              context.popoverAnchorId = undefined;
            }}
          >
            <Surface role='popover' data={popoverContent} />
            <Popover.Arrow />
          </Popover.Content>
        </Popover.Portal>
        <Dialog.Root open={dialogOpen} onOpenChange={(nextOpen) => (context.dialogOpen = nextOpen)}>
          <DensityProvider density='fine'>
            <Dialog.Overlay>
              {/* TODO(burdon): Move (thure)[ProfileSettings dialog in particular] dialog to settings-plugin. */}
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
    </Popover.Root>
  );
};
