//
// Copyright 2026 DXOS.org
//

import React, { Fragment, type UIEvent, useCallback, useEffect, useMemo, useRef } from 'react';

import { Main, type MainContentProps, useOnTransition } from '@dxos/react-ui';
import { DEFAULT_HORIZONTAL_SIZE, Stack, StackContext } from '@dxos/react-ui-stack';
import { mainPaddingTransitions, mx } from '@dxos/ui-theme';

import { useBreakpoints, useHoistStatusbar } from '../../hooks';
import { calculateOverscroll, layoutAppliesTopbar } from '../../util';
import { fixedComplementarySidebarToggleStyles, fixedSidebarToggleStyles } from './fragments';
import { ToggleComplementarySidebarButton, ToggleSidebarButton } from '../Sidebar';
import { useDeckContext } from './DeckRoot';
import { ConnectedPlank } from './DeckContent';
import { ContentEmpty } from './ContentEmpty';

/**
 * Deck viewport that renders the main content area.
 * Handles empty state, deck mode (horizontal stack), and solo mode.
 */
export const DeckViewport = () => {
  const { settings, state, deck, layoutMode } = useDeckContext('DeckViewport');
  const { sidebarState, complementarySidebarState } = state;
  const { active, companionOpen, companionVariant, fullscreen, solo, plankSizing } = deck;
  const effectiveCompanionVariant = companionOpen ? companionVariant : undefined;
  const breakpoint = useBreakpoints();
  const topbar = layoutAppliesTopbar(breakpoint, layoutMode);
  const hoistStatusbar = useHoistStatusbar(breakpoint, layoutMode);

  const scrollLeftRef = useRef<number>(null);
  const deckRef = useRef<HTMLDivElement>(null);

  /**
   * Clear scroll restoration state if the window is resized.
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
   * Save scroll position as the user scrolls.
   */
  const handleScroll = useCallback(
    (event: UIEvent) => {
      if (!solo && event.currentTarget === event.target) {
        scrollLeftRef.current = (event.target as HTMLDivElement).scrollLeft;
      }
    },
    [solo],
  );

  const isEmpty = !solo && active.length === 0;

  const padding = useMemo(() => {
    if (!solo && settings?.overscroll === 'centering') {
      return calculateOverscroll(active.length);
    }
    return {};
  }, [solo, settings?.overscroll, deck]);

  const mainPosition = useMemo(
    () => [
      'grid !top-[env(safe-area-inset-top)]',
      topbar && '!top-[calc(env(safe-area-inset-top)+var(--dx-rail-size))]',
      hoistStatusbar && 'lg:bottom-(--dx-statusbar-size)',
    ],
    [topbar, hoistStatusbar],
  );

  const { order, itemsCount }: { order: Record<string, number>; itemsCount: number } = useMemo(() => {
    return active.reduce(
      (acc: { order: Record<string, number>; itemsCount: number }, entryId) => {
        acc.order[entryId] = acc.itemsCount + 1;
        acc.itemsCount += companionOpen ? 3 : 2;
        return acc;
      },
      { order: {}, itemsCount: 0 },
    );
  }, [active, companionOpen]);

  if (isEmpty) {
    return (
      <Main.Content bounce handlesFocus classNames={mainPosition}>
        <ContentEmpty />
      </Main.Content>
    );
  }

  return (
    <Main.Content
      bounce
      handlesFocus
      classNames={mainPosition}
      style={
        {
          '--main-spacing': settings?.encapsulatedPlanks ? '0.75rem' : '0',
          '--dx-main-sidebar-width':
            sidebarState === 'expanded'
              ? 'var(--dx-nav-sidebar-size)'
              : sidebarState === 'collapsed'
                ? 'var(--dx-l0-size)'
                : '0',
          '--dx-main-complementary-width':
            complementarySidebarState === 'expanded'
              ? 'var(--dx-complementary-sidebar-size)'
              : complementarySidebarState === 'collapsed'
                ? 'var(--dx-rail-size)'
                : '0',
          '--dx-main-content-first-width': `${plankSizing[active[0] ?? 'never'] ?? DEFAULT_HORIZONTAL_SIZE}rem`,
          '--dx-main-content-last-width': `${plankSizing[active[(active.length ?? 1) - 1] ?? 'never'] ?? DEFAULT_HORIZONTAL_SIZE}rem`,
        } as MainContentProps['style']
      }
    >
      {/* Deck mode. */}
      <div
        role='none'
        className={!solo ? 'relative bg-deck-surface overflow-hidden' : 'sr-only'}
        {...(solo && { inert: true })}
      >
        {!topbar && !fullscreen && <ToggleSidebarButton classNames={fixedSidebarToggleStyles} />}
        {!topbar && !fullscreen && (
          <ToggleComplementarySidebarButton classNames={fixedComplementarySidebarToggleStyles} />
        )}
        <Stack
          classNames={[
            'absolute inset-y-(--main-spacing) -inset-w-px h-[calc(100%-2*var(--main-spacing))]',
            mainPaddingTransitions,
          ]}
          itemsCount={itemsCount - 1}
          size='contain'
          orientation='horizontal'
          style={padding}
          onScroll={handleScroll}
          ref={deckRef}
        >
          {active.map((entryId) => (
            <Fragment key={entryId}>
              <PlankSeparator order={order[entryId] - 1} encapsulate={!!settings?.encapsulatedPlanks} />
              <ConnectedPlank
                id={entryId}
                companionVariant={effectiveCompanionVariant}
                part='deck'
                order={order[entryId]}
                active={active}
                layoutMode={layoutMode}
                settings={settings}
              />
            </Fragment>
          ))}
        </Stack>
      </div>

      {/* Solo mode. */}
      <div
        role='none'
        className={solo ? 'relative overflow-hidden bg-deck-surface' : 'sr-only'}
        {...(!solo && { inert: true })}
      >
        {!topbar && !fullscreen && <ToggleSidebarButton classNames={fixedSidebarToggleStyles} />}
        {!topbar && !fullscreen && (
          <ToggleComplementarySidebarButton classNames={fixedComplementarySidebarToggleStyles} />
        )}
        <StackContext.Provider
          value={{
            orientation: 'horizontal',
            size: 'contain',
            rail: true,
          }}
        >
          <ConnectedPlank
            id={solo}
            companionVariant={effectiveCompanionVariant}
            part='solo'
            layoutMode={layoutMode}
            settings={settings}
          />
        </StackContext.Provider>
      </div>
    </Main.Content>
  );
};

const PlankSeparator = ({ order, encapsulate }: { order: number; encapsulate?: boolean }) =>
  order > 0 ? (
    <span
      role='separator'
      className={mx('row-span-2 bg-deck-surface', encapsulate ? 'w-0' : 'w-4')}
      style={{ gridColumn: order }}
    />
  ) : null;
