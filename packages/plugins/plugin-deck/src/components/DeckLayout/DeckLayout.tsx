//
// Copyright 2023 DXOS.org
//

import { Sidebar as MenuIcon } from '@phosphor-icons/react';
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';

import {
  SLUG_PATH_SEPARATOR,
  type Attention,
  LayoutAction,
  type LayoutParts,
  Surface,
  type Toast as ToastSchema,
  firstIdInPart,
  useIntentResolver,
  usePlugin,
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
  overscroll: Overscroll;
  flatDeck?: boolean;
  toasts: ToastSchema[];
  onDismissToast: (id: string) => void;
  // TODO(burdon): Rename planks or just items?
  layoutParts: LayoutParts;
  attention: Attention;
  slots?: {
    wallpaper?: { classNames?: string };
  };
};

export const DeckLayout = ({
  showHintsFooter,
  toasts,
  onDismissToast,
  flatDeck,
  attention,
  layoutParts,
  slots,
  overscroll,
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

  const searchEnabled = !!usePlugin('dxos.org/plugin/search');

  const fullScreenSlug = useMemo(() => firstIdInPart(layoutParts, 'fullScreen'), [layoutParts]);

  const complementarySlug = useMemo(() => {
    const entry = layoutParts.complementary?.at(0);
    if (entry) {
      return entry.path ? `${entry.id}${SLUG_PATH_SEPARATOR}${entry.path}` : entry.id;
    }
  }, [layoutParts]);

  const [activeId, setActiveId] = useState<string | undefined>(Array.from(attention.attended ?? [])[0]);
  const deckRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (layoutMode === 'deck' && activeId) {
      const el = deckRef.current?.querySelector(`article[data-attendable-id="${activeId}"]`);
      // TODO(burdon): Generalize scroll into view by parent.
      setTimeout(() => {
        el?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
      }, 100); // TODO(burdon): Hack. The element already exists but scrolling doesn't happen without the delay. Calculate or memo offset?
    }
  }, [layoutMode, activeId]);

  useIntentResolver(DECK_PLUGIN, ({ action, data }) => {
    switch (action) {
      case LayoutAction.SCROLL_INTO_VIEW: {
        setActiveId(data?.id);
        break;
      }
    }
  });

  if (layoutMode === 'fullscreen') {
    return <Fullscreen id={fullScreenSlug} />;
  }

  // TODO(burdon): Very specific args (move local to file or create struct?)
  const overscrollAmount = calculateOverscroll(
    layoutMode,
    sidebarOpen,
    complementarySidebarOpen,
    layoutParts,
    plankSizing,
    overscroll,
  );

  const isEmpty =
    (layoutMode === 'solo' && (!layoutParts.solo || layoutParts.solo.length === 0)) ||
    (layoutMode === 'deck' && (!layoutParts.main || layoutParts.main.length === 0));

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

        {/* Sidebars */}
        <Sidebar attention={attention} layoutParts={layoutParts} />

        <ComplementarySidebar id={complementarySlug} layoutParts={layoutParts} flatDeck={flatDeck} />

        {/* Dialog overlay to dismiss dialogs. */}
        <Main.Overlay />

        {/* No content. */}
        {isEmpty && (
          <Main.Content>
            <ContentEmpty />
          </Main.Content>
        )}

        {/* TODO(burdon): Preserve DOM structure between solo/deck mode. */}
        {!isEmpty && (
          <Main.Content bounce classNames={['grid', 'block-end-[--statusbar-size]']}>
            <Deck.Root
              classNames={[
                !flatDeck && 'surface-deck',
                layoutMode === 'deck' && [
                  'absolute inset-0',
                  'transition-[padding] duration-200 ease-in-out',
                  slots?.wallpaper?.classNames,
                ],
              ]}
              solo={layoutMode === 'solo'}
              style={{ ...overscrollAmount }}
              ref={deckRef}
            >
              {layoutMode === 'solo' &&
                layoutParts.solo?.map((layoutEntry) => {
                  return (
                    <Plank
                      key={layoutEntry.id}
                      entry={layoutEntry}
                      layoutParts={layoutParts}
                      part='solo'
                      flatDeck={flatDeck}
                    />
                  );
                })}
              {layoutMode === 'deck' &&
                layoutParts.main?.map((layoutEntry) => {
                  return (
                    <Plank
                      key={layoutEntry.id}
                      entry={layoutEntry}
                      layoutParts={layoutParts}
                      part='main'
                      resizeable
                      flatDeck={flatDeck}
                      searchEnabled={searchEnabled}
                    />
                  );
                })}
            </Deck.Root>
          </Main.Content>
        )}

        {/* Solo main content surface. */}
        {/* Main content surface. */}
        {/*
        {layoutMode === '__solo' && layoutParts.solo && layoutParts.solo.length > 0 && (
          <Main.Content bounce classNames={['grid', 'block-end-[--statusbar-size]']}>
            <Deck.Root classNames={[!flatDeck && 'surface-deck']} solo={true}>
              {layoutParts.solo.map((layoutEntry) => {
                return (
                  <Plank
                    key={layoutEntry.id}
                    entry={layoutEntry}
                    layoutParts={layoutParts}
                    part='solo'
                    flatDeck={flatDeck}
                  />
                );
              })}
            </Deck.Root>
          </Main.Content>
        )}

        {layoutMode === '__deck' && layoutParts.main && layoutParts.main.length > 0 && (
          <Main.Content bounce classNames={['grid', 'block-end-[--statusbar-size]']}>
            <div role='none' className='relative'>
              <Deck.Root
                classNames={mx(
                  !flatDeck && 'surface-deck',
                  'absolute inset-0',
                  'transition-[padding] duration-200 ease-in-out',
                  slots?.wallpaper?.classNames,
                )}
                style={{ ...overscrollAmount }}
                ref={deckRef}
              >
                {layoutParts.main.map((layoutEntry) => {
                  return (
                    <Plank
                      key={layoutEntry.id}
                      entry={layoutEntry}
                      layoutParts={layoutParts}
                      part='main'
                      resizeable
                      flatDeck={flatDeck}
                      searchEnabled={searchEnabled}
                    />
                  );
                })}
              </Deck.Root>
            </div>
          </Main.Content>
        )}
        */}

        {/* Note: This is not Main.Content */}
        <Main.Content role='none' classNames={['fixed inset-inline-0 block-end-0 z-[2]']}>
          <Surface role='status-bar' limit={1} />
        </Main.Content>

        {/* Help hints. */}
        {/* TODO(burdon): Make surface roles/names fully-qualified. */}
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
