//
// Copyright 2023 DXOS.org
//

import { untracked } from '@preact/signals-core';
import React, { useCallback, useEffect, useMemo, useRef, type UIEvent, Fragment } from 'react';

import {
  firstIdInPart,
  Surface,
  usePluginManager,
  type LayoutParts,
  type Toast as ToastSchema,
} from '@dxos/app-framework';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { AlertDialog, Dialog as NaturalDialog, Main, Popover, useOnTransition, type MainProps } from '@dxos/react-ui';
import { Stack, StackContext, DEFAULT_HORIZONTAL_SIZE } from '@dxos/react-ui-stack';
import { mainPaddingTransitions } from '@dxos/react-ui-theme';

import { ActiveNode } from './ActiveNode';
import { ComplementarySidebar, type ComplementarySidebarProps } from './ComplementarySidebar';
import { ContentEmpty } from './ContentEmpty';
import { Fullscreen } from './Fullscreen';
import { Plank } from './Plank';
import { Sidebar } from './Sidebar';
import { ToggleSidebarButton } from './SidebarButton';
import { StatusBar } from './StatusBar';
import { Toast } from './Toast';
import { Topbar } from './Topbar';
import { type Overscroll } from '../../types';
import { calculateOverscroll, layoutAppliesTopbar, useBreakpoints } from '../../util';
import { useHoistStatusbar } from '../../util/useHoistStatusbar';
import { useDeckContext } from '../DeckContext';
import { useLayout } from '../LayoutContext';

export type DeckLayoutProps = {
  layoutParts: LayoutParts;
  toasts: ToastSchema[];
  overscroll: Overscroll;
  showHints: boolean;
  onDismissToast: (id: string) => void;
} & Pick<ComplementarySidebarProps, 'panels'>;

const PlankSeparator = ({ index }: { index: number }) =>
  index > 0 ? <span role='separator' className='row-span-2 bg-deck is-4' style={{ gridColumn: index * 2 }} /> : null;

const fixedSidebarToggleStyles = 'bs-[--rail-item] is-[--rail-item] absolute inline-start-2 block-end-2 z-[1] !bg-deck';

export const DeckLayout = ({ layoutParts, toasts, overscroll, showHints, panels, onDismissToast }: DeckLayoutProps) => {
  const context = useLayout();
  const {
    layoutMode,
    sidebarOpen,
    complementarySidebarOpen,
    dialogOpen,
    dialogContent,
    dialogBlockAlign,
    dialogType,
    popoverOpen,
    popoverContent,
    popoverAnchorId,
  } = context;
  const breakpoint = useBreakpoints();
  const topbar = layoutAppliesTopbar(breakpoint);
  const hoistStatusbar = useHoistStatusbar(breakpoint);
  const { plankSizing } = useDeckContext();
  const pluginManager = usePluginManager();
  const fullScreenSlug = useMemo(() => firstIdInPart(layoutParts, 'fullScreen'), [layoutParts]);

  const scrollLeftRef = useRef<number | null>();
  const deckRef = useRef<HTMLDivElement>(null);

  const isSoloModeLoaded = layoutMode === 'solo' && Boolean(layoutParts.solo?.[0]);

  // Ensure the first plank is attended when the deck is first rendered.
  useEffect(() => {
    // NOTE: Not `useAttended` so that the layout component is not re-rendered when the attended list changes.
    const attended = untracked(() => {
      const attention = pluginManager.context.requestCapability(AttentionCapabilities.Attention);
      return attention.current;
    });
    const firstId = isSoloModeLoaded ? firstIdInPart(layoutParts, 'solo') : firstIdInPart(layoutParts, 'main');
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

  const isEmpty = (layoutParts.main?.length ?? 0) === 0 && (layoutParts.solo?.length ?? 0) === 0;

  const padding = useMemo(() => {
    if (layoutMode === 'deck' && overscroll === 'centering') {
      return calculateOverscroll(layoutParts.main?.length ?? 0);
    }
    return {};
  }, [layoutMode, overscroll, layoutParts.main]);

  const Dialog = dialogType === 'alert' ? AlertDialog : NaturalDialog;

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

      {layoutMode === 'fullscreen' && <Fullscreen id={fullScreenSlug} />}

      {layoutMode !== 'fullscreen' && (
        <Main.Root
          navigationSidebarOpen={context.sidebarOpen}
          onNavigationSidebarOpenChange={(next) => (context.sidebarOpen = next)}
          complementarySidebarOpen={context.complementarySidebarOpen}
          onComplementarySidebarOpenChange={(next) => (context.complementarySidebarOpen = next)}
        >
          {/* Left sidebar. */}
          <Sidebar />

          {/* Right sidebar. */}
          <ComplementarySidebar panels={panels} current={layoutParts.complementary?.[0].id} />

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
            <Main.Content
              bounce
              classNames={[
                'grid !block-start-[env(safe-area-inset-top)]',
                topbar && '!block-start-[calc(env(safe-area-inset-top)+var(--rail-size))]',
                hoistStatusbar && 'lg:block-end-[--statusbar-size]',
              ]}
              handlesFocus
              style={
                {
                  '--dx-main-sidebarWidth': sidebarOpen ? 'var(--nav-sidebar-size)' : '0px',
                  '--dx-main-complementaryWidth': complementarySidebarOpen
                    ? 'var(--complementary-sidebar-size)'
                    : '0px',
                  '--dx-main-contentFirstWidth': `${plankSizing[layoutParts.main?.[0]?.id ?? 'never'] ?? DEFAULT_HORIZONTAL_SIZE}rem`,
                  '--dx-main-contentLastWidth': `${plankSizing[layoutParts.main?.[(layoutParts.main?.length ?? 1) - 1]?.id ?? 'never'] ?? DEFAULT_HORIZONTAL_SIZE}rem`,
                } as MainProps['style']
              }
            >
              <div
                role='none'
                className={!isSoloModeLoaded ? 'relative bg-deck overflow-hidden' : 'sr-only'}
                {...(isSoloModeLoaded && { inert: '' })}
              >
                {!topbar && <ToggleSidebarButton variant='default' classNames={fixedSidebarToggleStyles} />}
                <Stack
                  orientation='horizontal'
                  size='contain'
                  classNames={['absolute inset-block-0 -inset-inline-px', mainPaddingTransitions]}
                  onScroll={handleScroll}
                  itemsCount={2 * (layoutParts.main?.length ?? 0) - 1}
                  style={padding}
                  ref={deckRef}
                >
                  {layoutParts.main?.map((layoutEntry, index) => (
                    <Fragment key={layoutEntry.id}>
                      <PlankSeparator index={index} />
                      <Plank
                        entry={layoutEntry}
                        layoutParts={layoutParts}
                        part='main'
                        layoutMode={layoutMode}
                        order={index * 2 + 1}
                      />
                    </Fragment>
                  ))}
                </Stack>
              </div>
              <div
                role='none'
                className={isSoloModeLoaded ? 'relative bg-deck overflow-hidden' : 'sr-only'}
                {...(!isSoloModeLoaded && { inert: '' })}
              >
                {!topbar && <ToggleSidebarButton variant='default' classNames={fixedSidebarToggleStyles} />}
                <StackContext.Provider value={{ size: 'contain', orientation: 'horizontal', rail: true }}>
                  <Plank entry={layoutParts.solo?.[0]} layoutParts={layoutParts} part='solo' layoutMode={layoutMode} />
                </StackContext.Provider>
              </div>
            </Main.Content>
          )}

          {/* Status bar. */}
          {topbar && <Topbar />}
          {hoistStatusbar && <StatusBar showHints={showHints} />}
        </Main.Root>
      )}

      {/* Global popovers. */}
      <Popover.Portal>
        <Popover.Content
          onEscapeKeyDown={() => {
            context.popoverOpen = false;
            context.popoverAnchorId = undefined;
          }}
        >
          <Popover.Viewport>
            <Surface role='popover' data={popoverContent} limit={1} />
          </Popover.Viewport>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>

      {/* Global dialog. */}
      <Dialog.Root open={dialogOpen} onOpenChange={(nextOpen) => (context.dialogOpen = nextOpen)}>
        <Dialog.Overlay blockAlign={dialogBlockAlign}>
          <Surface role='dialog' data={dialogContent} limit={1} />
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
    </Popover.Root>
  );
};
