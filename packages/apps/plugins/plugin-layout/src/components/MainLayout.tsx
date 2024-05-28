//
// Copyright 2023 DXOS.org
//

import { Sidebar as MenuIcon, X } from '@phosphor-icons/react';
import React from 'react';

import { Surface, type Toast as ToastSchema } from '@dxos/app-framework';
import { Button, Main, Dialog, useTranslation, DensityProvider, Popover, Status } from '@dxos/react-ui';
import { useAttendable } from '@dxos/react-ui-deck';
import { baseSurface, fixedInsetFlexLayout, getSize } from '@dxos/react-ui-theme';

import { Fallback } from './Fallback';
import { Toast } from './Toast';
import { useLayout } from '../LayoutContext';
import { LAYOUT_PLUGIN } from '../meta';

export type MainLayoutProps = {
  attendableId: string;
  activeIds: Set<string>;
  attended?: Set<string>;
  fullscreen: boolean;
  showHintsFooter: boolean;
  toasts: ToastSchema[];
  onDismissToast: (id: string) => void;
};

export const MainLayout = ({
  attended,
  attendableId,
  activeIds,
  fullscreen,
  showHintsFooter,
  toasts,
  onDismissToast,
}: MainLayoutProps) => {
  const context = useLayout();
  const {
    complementarySidebarOpen,
    complementarySidebarContent,
    dialogOpen,
    dialogContent,
    dialogBlockAlign,
    popoverOpen,
    popoverContent,
    popoverAnchorId,
  } = context;
  const { t } = useTranslation(LAYOUT_PLUGIN);

  const attendableAttrs = useAttendable(attendableId);

  if (fullscreen) {
    return (
      <div className={fixedInsetFlexLayout}>
        <Surface role='main' limit={1} fallback={Fallback} />
      </div>
    );
  }

  return (
    <Popover.Root
      modal
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
        <Main.NavigationSidebar>
          <Surface
            role='navigation'
            data={{
              popoverAnchorId,
              activeIds,
              attended,
            }}
          />
        </Main.NavigationSidebar>

        {/* Notch */}
        <Main.Notch>
          <Surface role='notch-start' />
          <Button
            onClick={() => (context.sidebarOpen = !context.sidebarOpen)}
            variant='ghost'
            classNames='p-0 is-[--rail-action] border-bs-4 border-be-4 border-transparent bg-clip-padding'
          >
            <span className='sr-only'>{t('open navigation sidebar label')}</span>
            <MenuIcon weight='light' className={getSize(5)} />
          </Button>
          <Surface role='notch-end' />
        </Main.Notch>

        {/* Right Complementary sidebar. */}
        <Main.ComplementarySidebar classNames='overflow-hidden grid grid-cols-1 grid-rows-[var(--rail-size)_1fr]'>
          <Button
            variant='ghost'
            classNames='absolute block-start-1 inline-end-1 p-0 bs-[--rail-action] is-[--rail-action]'
            onClick={() => (context.complementarySidebarOpen = false)}
          >
            <X />
          </Button>
          <Surface role='complementary' data={complementarySidebarContent} />
        </Main.ComplementarySidebar>

        {/* Top (header) bar. */}
        <Main.Content classNames={['fixed inset-inline-0 block-start-0 z-[2]', baseSurface]} asChild>
          <div aria-label={t('main header label')} role='none'>
            <div role='none' className='flex items-center gap-1 bs-[--rail-size]'>
              <Surface role='navbar-start' />
              <div role='none' className='grow' />
              <Surface role='navbar-end' direction='inline-reverse' />
              {complementarySidebarContent && (
                <Button
                  onClick={() => (context.complementarySidebarOpen = !context.complementarySidebarOpen)}
                  variant='ghost'
                  classNames='p-0 bs-[var(--rail-action)] is-[var(--rail-action)] m-1'
                >
                  <span className='sr-only'>{t('open complementary sidebar label')}</span>
                  <MenuIcon weight='light' mirrored className={getSize(5)} />
                </Button>
              )}
            </div>
          </div>
        </Main.Content>

        {/* Dialog overlay to dismiss dialogs. */}
        <Main.Overlay />

        {/* Main content surface. */}
        <div role='none' className='contents' {...attendableAttrs}>
          <Surface
            role='main'
            limit={1}
            fallback={Fallback}
            placeholder={
              // TODO(wittjosiah): Better placeholder? Delay rendering?
              <div className='flex bs-[100dvh] justify-center items-center'>
                <Status indeterminate aria-label='Initializing' />
              </div>
            }
          />
        </div>

        {/* Help hints. */}
        {/* TODO(burdon): Make surface roles/names fully-qualified. */}
        {showHintsFooter && (
          <div className='fixed bottom-0 left-0 right-0 h-[32px] z-[1] flex justify-center'>
            <Surface role='hints' limit={1} />
          </div>
        )}

        {/* Status info. */}
        <div role='none' className='fixed block-end-0 inset-inline-0'>
          <Surface role='status-bar' limit={1} />
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
            <Dialog.Overlay blockAlign={dialogBlockAlign}>
              <Surface role='dialog' data={dialogContent} />
            </Dialog.Overlay>
          </DensityProvider>
        </Dialog.Root>

        {/* Global toasts. */}
        {toasts?.map((toast) => (
          <Toast
            {...toast}
            key={toast.id}
            onOpenChange={(open) => {
              if (!open) {
                onDismissToast(toast.id);
              }

              return open;
            }}
          />
        ))}
      </Main.Root>
    </Popover.Root>
  );
};
