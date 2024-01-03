//
// Copyright 2023 DXOS.org
//

import { CaretDoubleLeft, List as MenuIcon } from '@phosphor-icons/react';
import React from 'react';

import { Surface } from '@dxos/app-framework';
import { Button, Main, Dialog, useTranslation, DensityProvider, Popover } from '@dxos/react-ui';
import { baseSurface, fixedInsetFlexLayout, getSize } from '@dxos/react-ui-theme';

import { ContentFallback } from './ContentFallback';
import { Fallback } from './Fallback';
import { useLayout } from '../LayoutContext';
import { LAYOUT_PLUGIN } from '../meta';

export type MainLayoutProps = {
  fullscreen?: boolean;
  showComplementarySidebar?: boolean;
};

export const MainLayout = ({ fullscreen, showComplementarySidebar = true }: MainLayoutProps) => {
  const context = useLayout();
  const { complementarySidebarOpen, dialogOpen, dialogContent, popoverOpen, popoverContent, popoverAnchorId } = context;
  const { t } = useTranslation(LAYOUT_PLUGIN);

  if (fullscreen) {
    return (
      <div className={fixedInsetFlexLayout}>
        <Surface role='main' limit={1} fallback={Fallback} />
      </div>
    );
  }

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
        <Surface role='document-title' name='documentTitle' limit={1} />
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
          <Surface role='navigation' name='sidebar' />
        </Main.NavigationSidebar>

        {/* Right Complementary sidebar. */}
        {complementarySidebarOpen !== null && showComplementarySidebar && (
          <Main.ComplementarySidebar classNames='overflow-hidden'>
            <Surface role='context' name='complementary' />
          </Main.ComplementarySidebar>
        )}

        {/* Top (header) bar. */}
        <Main.Content classNames={['fixed inset-inline-0 block-start-0 z-[2]', baseSurface]} asChild>
          <div aria-label={t('main header label')} role='none'>
            <div role='none' className={'flex gap-1 p-1 bs-[--topbar-size]'}>
              <DensityProvider density='coarse'>
                <Button
                  onClick={() => (context.sidebarOpen = !context.sidebarOpen)}
                  variant='ghost'
                  classNames='pli-2.5'
                >
                  <span className='sr-only'>{t('open navigation sidebar label')}</span>
                  <MenuIcon weight='light' className={getSize(4)} />
                </Button>

                <Surface role='heading' limit={2} />
                <div role='none' className='grow' />

                {/* TODO(burdon): Too specific? status? contentinfo? */}
                <Surface role='presence' limit={1} />

                {complementarySidebarOpen !== null && showComplementarySidebar && (
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
              </DensityProvider>
            </div>
          </div>
        </Main.Content>

        {/* Dialog overlay to dismiss dialogs. */}
        <Main.Overlay />

        {/* Main content surface. */}
        <Surface role='main' limit={1} fallback={Fallback} contentFallback={ContentFallback} />

        {/* Status info. */}
        {/* TODO(burdon): Currently obscured by complementary sidebar. */}
        <div role='none' aria-label={t('status label')} className='fixed bottom-0 right-0 z-[1]'>
          <Surface role='status' limit={1} />
        </div>

        {/* Help hints. */}
        {/* TODO(burdon): Make surface roles/names fully-qualified. */}
        <div className='fixed bottom-0 left-0 right-0 z-[1] flex justify-center __pointer-events-none'>
          <Surface role='hints' limit={1} />
        </div>

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
              <Surface role='dialog' data={dialogContent} />
            </Dialog.Overlay>
          </DensityProvider>
        </Dialog.Root>
      </Main.Root>
    </Popover.Root>
  );
};
