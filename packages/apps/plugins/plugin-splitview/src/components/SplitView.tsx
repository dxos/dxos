//
// Copyright 2023 DXOS.org
//

import { CaretDoubleLeft, List as MenuIcon } from '@phosphor-icons/react';
import React, { useContext } from 'react';

import { Button, Main, Dialog, useTranslation, DensityProvider, Popover } from '@dxos/aurora';
import { coarseBlockSize, fixedSurface, getSize, mx } from '@dxos/aurora-theme';
import { Surface } from '@dxos/react-surface';
import { useConfig } from '@dxos/react-client';

import { useSplitView } from '../SplitViewContext';
import { SPLITVIEW_PLUGIN } from '../types';
import { VersionInfo } from './VersionInfo';

export const SplitView = () => {
  const context = useSplitView();
  const { complementarySidebarOpen, dialogOpen, dialogContent, popoverOpen, popoverContent, popoverAnchorId } = context;
  const { t } = useTranslation(SPLITVIEW_PLUGIN);

  const config = useConfig();
  const version = config.values.runtime?.app?.build;
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
      <div role='none' className='sr-only'>
        <Surface name='documentTitle' limit={1} />
      </div>
      <Main.Root
        navigationSidebarOpen={context.sidebarOpen}
        onNavigationSidebarOpenChange={(next) => (context.sidebarOpen = next)}
        {...(complementarySidebarOpen !== null && {
          complementarySidebarOpen: context.complementarySidebarOpen as boolean,
          onComplementarySidebarOpenChange: (next) => (context.complementarySidebarOpen = next),
        })}
      >
        {/* Left navigation sidebar. */}
        <Main.NavigationSidebar classNames='overflow-hidden'>
          <Surface name='sidebar' />
        </Main.NavigationSidebar>

        {/* Right Complementary sidebar. */}
        {complementarySidebarOpen !== null && (
          <Main.ComplementarySidebar classNames='overflow-hidden'>
            {/* TODO(burdon): name vs. role? */}
            <Surface name='complementary' role='complementary' />
          </Main.ComplementarySidebar>
        )}

        {/* Top (header) bar. */}
        <Main.Content asChild classNames={['fixed inset-inline-0 block-start-0 z-[1] flex gap-1', coarseBlockSize]}>
          <div role='none' aria-label={t('main header label')}>
            <DensityProvider density='fine'>
              <div className='backdrop-blur flex mbs-2.5'>
                <Button onClick={() => (context.sidebarOpen = !context.sidebarOpen)} variant='ghost' classNames='mli-1'>
                  <span className='sr-only'>{t('open navigation sidebar label')}</span>
                  <MenuIcon weight='light' className={getSize(4)} />
                </Button>
                <Surface name='heading' role='heading' limit={2} />
              </div>
              <div role='none' className='grow' />
              <div className='backdrop-blur flex pis-1 mbs-2.5'>
              {/* TODO(burdon): Too specific? status? contentinfo? */}
              <Surface name='presence' role='presence' limit={1} />
              {complementarySidebarOpen !== null && (
                <Button
                  onClick={() => (context.complementarySidebarOpen = !context.complementarySidebarOpen)}
                  variant='ghost'
                >
                  <span className='sr-only'>{t('open complementary sidebar label')}</span>
                  <CaretDoubleLeft
                    mirrored={!!context.complementarySidebarOpen}
                    weight='light'
                    className={getSize(4)}
                  />
                </Button>
              )}
              </div>
            </DensityProvider>
          </div>
        </Main.Content>

        {/* Status info. */}
        {/* TODO(burdon): Currently covered by complementary sidebar. */}
        <div role='none' aria-label={t('status label')} className={mx('fixed bottom-0 right-0 z-[1]', fixedSurface)}>
          <Surface name='status' role='status' />
        </div>

        {/* Dialog overlay to dismiss dialogs. */}
        <Main.Overlay />

        {/* Main content surface. */}
        <Surface name='main' role='main' />

        {/* Global popovers. */}
        <Popover.Portal>
          <Popover.Content
            classNames='z-[60]'
            onEscapeKeyDown={() => {
              context.popoverOpen = false;
              context.popoverAnchorId = undefined;
            }}
          >
            <Popover.Viewport>
              <Surface role='popover' data={popoverContent} />
            </Popover.Viewport>
            <Popover.Arrow />
          </Popover.Content>
        </Popover.Portal>

        {/* Global dialog. */}
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

                  <VersionInfo className='mbs-2' {...version} />
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
