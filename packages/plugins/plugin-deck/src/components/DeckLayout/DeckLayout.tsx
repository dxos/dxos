//
// Copyright 2023 DXOS.org
//

import { Sidebar as MenuIcon } from '@phosphor-icons/react';
import React, { useEffect, useMemo, useRef } from 'react';

import {
  SLUG_PATH_SEPARATOR,
  type Attention,
  type LayoutParts,
  Surface,
  type Toast as ToastSchema,
  firstIdInPart,
  usePlugin,
  type LayoutEntry,
} from '@dxos/app-framework';
import { Button, Dialog, Main, Popover, useTranslation } from '@dxos/react-ui';
import { Deck } from '@dxos/react-ui-deck';
import { getSize } from '@dxos/react-ui-theme';

import { ActiveNode } from './ActiveNode';
import { ComplementarySidebar } from './ComplementarySidebar';
import { ContentEmpty } from './ContentEmpty';
import { Fullscreen } from './Fullscreen';
import { Plank } from './Plank';
import { Sidebar } from './Sidebar';
import { Toast } from './Toast';
import { DECK_PLUGIN } from '../../meta';
import { type Overscroll } from '../../types';
import { calculateOverscroll } from '../../util';
import { useDeckContext } from '../DeckContext';
import { useLayout } from '../LayoutContext';

export type DeckLayoutProps = {
  showHintsFooter: boolean;
  toasts: ToastSchema[];
  // TODO(burdon): Rename planks or just items?
  layoutParts: LayoutParts;
  attention: Attention;
  // TODO(burdon): Remove.
  flatDeck?: boolean;
  overscroll: Overscroll;
  slots?: {
    wallpaper?: { classNames?: string };
  };
  onDismissToast: (id: string) => void;
};

export const DeckLayout = ({
  showHintsFooter,
  toasts,
  attention,
  layoutParts,
  flatDeck,
  overscroll,
  slots,
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
  const searchPlugin = usePlugin('dxos.org/plugin/search');
  const fullScreenSlug = useMemo(() => firstIdInPart(layoutParts, 'fullScreen'), [layoutParts]);

  const complementarySlug = useMemo(() => {
    const entry = layoutParts.complementary?.at(0);
    if (entry) {
      return entry.path ? `${entry.id}${SLUG_PATH_SEPARATOR}${entry.path}` : entry.id;
    }
  }, [layoutParts]);

  const activeId = useMemo(() => Array.from(attention.attended ?? [])[0], [attention.attended]);

  const deckRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (layoutMode === 'deck' && activeId) {
      // TODO(burdon): Can we prevent the need to re-scroll since the planks are preserved?
      //  E.g., hide the deck and just move the solo article?
      setTimeout(() => {
        const el = deckRef.current?.querySelector(`article[data-attendable-id="${activeId}"]`);
        el?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
      }, 500);
    }
  }, [layoutMode, activeId]);

  const parts: LayoutEntry[] = layoutParts.main ?? layoutParts.solo ?? [];

  const padding =
    layoutMode === 'deck' && overscroll === 'centering'
      ? calculateOverscroll(layoutParts.main, plankSizing, sidebarOpen, complementarySidebarOpen)
      : {};

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
      {/* TODO(burdon): Document this. */}
      <ActiveNode id={activeId} />

      <Main.Root
        navigationSidebarOpen={context.sidebarOpen}
        onNavigationSidebarOpenChange={(next) => (context.sidebarOpen = next)}
        {...(complementarySidebarOpen !== null && {
          complementarySidebarOpen: /* complementaryAvailable && */ context.complementarySidebarOpen as boolean,
          onComplementarySidebarOpenChange: (next) => (context.complementarySidebarOpen = next),
        })}
      >
        {/* Notch */}
        <Main.Notch classNames='z-[21]'>
          <Surface role='notch-start' />
          <Button
            // disabled={!sidebarAvailable}
            onClick={() => (context.sidebarOpen = !context.sidebarOpen)}
            variant='ghost'
            classNames='p-1'
          >
            <span className='sr-only'>{t('open navigation sidebar label')}</span>
            <MenuIcon weight='light' className={getSize(5)} />
          </Button>
          <Button
            // disabled={!complementaryAvailable}
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
        <Sidebar attention={attention} layoutParts={layoutParts} />

        {/* Right sidebar. */}
        <ComplementarySidebar id={complementarySlug} layoutParts={layoutParts} flatDeck={flatDeck} />

        {/* Dialog overlay to dismiss dialogs. */}
        <Main.Overlay />

        {/* No content. */}
        {parts.length === 0 && (
          <Main.Content>
            <ContentEmpty />
          </Main.Content>
        )}

        {/* Solo/deck mode. */}
        {parts.length !== 0 && (
          <Main.Content bounce classNames={['grid', 'block-end-[--statusbar-size]']}>
            <div role='none' className={layoutMode === 'solo' ? 'contents' : 'relative'}>
              <Deck.Root
                ref={deckRef}
                solo={layoutMode === 'solo'}
                style={padding}
                classNames={[
                  !flatDeck && 'surface-deck',
                  layoutMode === 'deck' && [
                    'absolute inset-0',
                    'transition-[padding] duration-200 ease-in-out',
                    slots?.wallpaper?.classNames,
                  ],
                ]}
              >
                {parts.map((layoutEntry) => (
                  <Plank
                    key={layoutEntry.id}
                    entry={layoutEntry}
                    layoutParts={layoutParts}
                    part={layoutMode === 'solo' && layoutEntry.id === activeId ? 'solo' : 'main'}
                    flatDeck={flatDeck}
                    searchEnabled={!!searchPlugin}
                    resizeable={layoutMode === 'deck'}
                    classNames={layoutMode === 'deck' || layoutEntry.id === activeId ? '' : 'hidden'}
                  />
                ))}
              </Deck.Root>
            </div>
          </Main.Content>
        )}

        {/* TODO(burdon): Remove? */}
        {/* Note: This is not Main.Content */}
        <Main.Content role='none' classNames={['fixed inset-inline-0 block-end-0 z-[2]']}>
          <Surface role='status-bar' limit={1} />
        </Main.Content>

        {/* Help hints. */}
        {/* TODO(burdon): Need to make room for this in status bar. */}
        {showHintsFooter && (
          <div className='fixed bottom-0 left-0 right-0 h-[32px] z-[1] flex justify-center'>
            <Surface role='hints' limit={1} />
          </div>
        )}

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
