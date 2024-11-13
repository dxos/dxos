//
// Copyright 2023 DXOS.org
//

import { Sidebar as MenuIcon } from '@phosphor-icons/react';
import { untracked } from '@preact/signals-core';
import React, { useCallback, useEffect, useMemo, useRef, type UIEvent } from 'react';

import { type LayoutParts, Surface, type Toast as ToastSchema, firstIdInPart, usePlugin } from '@dxos/app-framework';
import { type AttentionPluginProvides } from '@dxos/plugin-attention';
import { Button, Dialog, Main, Popover, useOnTransition, useTranslation } from '@dxos/react-ui';
import { Stack } from '@dxos/react-ui-stack/next';
import { getSize, mainPaddingTransitions } from '@dxos/react-ui-theme';

import { ActiveNode } from './ActiveNode';
import { ComplementarySidebar, type ComplementarySidebarProps } from './ComplementarySidebar';
import { ContentEmpty } from './ContentEmpty';
import { Fullscreen } from './Fullscreen';
import { Plank } from './Plank';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { Toast } from './Toast';
import { DECK_PLUGIN } from '../../meta';
import { type Overscroll } from '../../types';
import { calculateOverscroll } from '../../util';
import { useDeckContext } from '../DeckContext';
import { useLayout } from '../LayoutContext';

export type DeckLayoutProps = {
  layoutParts: LayoutParts;
  toasts: ToastSchema[];
  flatDeck?: boolean;
  overscroll: Overscroll;
  showHints: boolean;
  onDismissToast: (id: string) => void;
} & Pick<ComplementarySidebarProps, 'panels'>;

const overscrollStyles = 'bg-deck row-span-2 transition-[inline-size] duration-200 ease-in-out-symmetric';

export const DeckLayout = ({
  layoutParts,
  toasts,
  flatDeck,
  overscroll,
  showHints,
  panels,
  onDismissToast,
}: DeckLayoutProps) => {
  const context = useLayout();
  const {
    layoutMode,
    sidebarOpen,
    complementarySidebarOpen,
    dialogOpen,
    dialogContent,
    dialogBlockAlign,
    popoverOpen,
    popoverContent,
    popoverAnchorId,
  } = context;
  const { t } = useTranslation(DECK_PLUGIN);
  const { plankSizing } = useDeckContext();
  // NOTE: Not `useAttended` so that the layout component is not re-rendered when the attended list changes.
  const attentionPlugin = usePlugin<AttentionPluginProvides>('dxos.org/plugin/attention');
  const searchPlugin = usePlugin('dxos.org/plugin/search');
  const fullScreenSlug = useMemo(() => firstIdInPart(layoutParts, 'fullScreen'), [layoutParts]);

  const scrollLeftRef = useRef<number | null>();
  const deckRef = useRef<HTMLDivElement>(null);

  // Ensure the first plank is attended when the deck is first rendered.
  useEffect(() => {
    const attended = untracked(() => attentionPlugin?.provides.attention.attended ?? []);
    const firstId = layoutMode === 'solo' ? firstIdInPart(layoutParts, 'solo') : firstIdInPart(layoutParts, 'main');
    if (attended.length === 0 && firstId) {
      // TODO(wittjosiah): Focusing the type button is a workaround.
      //   If the plank is directly focused on first load the focus ring appears.
      document.querySelector<HTMLElement>(`article[data-attendable-id="${firstId}"] button`)?.focus();
    }
  }, []);

  /**
   * Clear scroll restoration state if the window is resized
   */
  const handleResize = useCallback(() => {
    scrollLeftRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  const restoreScroll = useCallback(() => {
    if (deckRef.current && scrollLeftRef.current != null) {
      deckRef.current.scrollLeft = scrollLeftRef.current;
    }
  }, []);

  useOnTransition(layoutMode, (mode) => mode !== 'deck', 'deck', restoreScroll);

  /**
   * Save scroll position as the user scrolls
   */
  const handleScroll = useCallback(
    (event: UIEvent) => {
      if (layoutMode === 'deck' && event.currentTarget === event.target) {
        scrollLeftRef.current = (event.target as HTMLDivElement).scrollLeft;
      }
    },
    [layoutMode],
  );

  const isEmpty = layoutParts.main?.length === 0 && layoutParts.solo?.length === 0;

  const padding = useMemo(() => {
    if (layoutMode === 'deck' && overscroll === 'centering') {
      return calculateOverscroll(layoutParts.main, plankSizing, sidebarOpen, complementarySidebarOpen);
    }
    return {};
  }, [layoutMode, overscroll, layoutParts.main, plankSizing, sidebarOpen, complementarySidebarOpen]);

  if (layoutMode === 'fullscreen') {
    return <Fullscreen id={fullScreenSlug} />;
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
      <ActiveNode />

      <Main.Root
        navigationSidebarOpen={context.sidebarOpen}
        onNavigationSidebarOpenChange={(next) => (context.sidebarOpen = next)}
        complementarySidebarOpen={context.complementarySidebarOpen}
        onComplementarySidebarOpenChange={(next) => (context.complementarySidebarOpen = next)}
      >
        {/* Notch */}
        <Main.Notch classNames='z-[21]'>
          <Surface role='notch-start' />
          <Button onClick={() => (context.sidebarOpen = !context.sidebarOpen)} variant='ghost' classNames='p-1'>
            <span className='sr-only'>{t('open navigation sidebar label')}</span>
            <MenuIcon weight='light' className={getSize(5)} />
          </Button>
          <Button
            onClick={() => (context.complementarySidebarOpen = !context.complementarySidebarOpen)}
            variant='ghost'
            classNames='p-1'
          >
            <span className='sr-only'>{t('open complementary sidebar label')}</span>
            <MenuIcon mirrored weight='light' className={getSize(5)} />
          </Button>
          <Surface role='notch-end' />
        </Main.Notch>

        {/* Left sidebar. */}
        <Sidebar layoutParts={layoutParts} />

        {/* Right sidebar. */}
        <ComplementarySidebar panels={panels} current={layoutParts.complementary?.[0].id} flatDeck={flatDeck} />

        {/* Dialog overlay to dismiss dialogs. */}
        <Main.Overlay />

        {/* No content. */}
        {isEmpty && (
          <Main.Content handlesFocus>
            <ContentEmpty />
          </Main.Content>
        )}

        {/* Solo/deck mode. */}
        {!isEmpty && (
          <Main.Content bounce classNames='grid block-end-[--statusbar-size]' handlesFocus>
            <div role='none' className='relative'>
              <Stack
                orientation='horizontal'
                size='contain'
                classNames={[
                  // The overscroll spans need these magic inline insets in order to compensate for the gaps.
                  'absolute inset-block-0 -inline-start-px inline-end-[-2px]',
                  mainPaddingTransitions,
                ]}
                onScroll={handleScroll}
                ref={deckRef}
              >
                {padding && (
                  <span role='none' className={overscrollStyles} style={{ inlineSize: padding.paddingInlineStart }} />
                )}
                <Plank
                  entry={layoutParts.solo?.[0]}
                  layoutParts={layoutParts}
                  part='solo'
                  layoutMode={layoutMode}
                  flatDeck={flatDeck}
                  searchEnabled={!!searchPlugin}
                />
                {layoutParts.main?.map((layoutEntry) => (
                  <Plank
                    key={layoutEntry.id}
                    entry={layoutEntry}
                    layoutParts={layoutParts}
                    part='main'
                    layoutMode={layoutMode}
                    flatDeck={flatDeck}
                    searchEnabled={!!searchPlugin}
                  />
                ))}
                {padding && (
                  <span role='none' className={overscrollStyles} style={{ inlineSize: padding.paddingInlineEnd }} />
                )}
              </Stack>
            </div>
          </Main.Content>
        )}

        {/* Footer status. */}
        <StatusBar showHints={showHints} />

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
          <Dialog.Overlay blockAlign={dialogBlockAlign}>
            <Surface role='dialog' data={dialogContent} />
          </Dialog.Overlay>
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
