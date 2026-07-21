//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useEffect, useRef } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { addEventListener } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { IconButton, Main, type MainContentProps, ScrollArea, useOnTransition, useTranslation } from '@dxos/react-ui';
import { mainIntrinsicSize, mainPaddingTransitions } from '@dxos/react-ui';
import { Mosaic, type MosaicStackTileComponent, type MosaicTileProps } from '@dxos/react-ui-mosaic';
import { hoverableControls, hoverableFocusedWithinControls, mx } from '@dxos/ui-theme';

import { useBreakpoints, useDeckState } from '#hooks';
import { meta } from '#meta';
import { DeckOperation, Keyshortcuts, getMode } from '#types';

import { layoutAppliesTopbar } from '../../util';
import {
  ToggleComplementarySidebarButton as NaturalToggleComplementarySidebarButton,
  ToggleSidebarButton as NaturalToggleSidebarButton,
} from '../Sidebar';
import { DeckPlank } from './DeckPlank';
import { useDeckContext } from './DeckRoot';

const DECK_VIEWPORT_NAME = 'DeckViewport';

// Multi-mode plank extents (rem); each plank persists its own width via `plankSizing`.
const DEFAULT_PLANK_SIZE = 50;
const MIN_PLANK_SIZE = 20;
const MAX_PLANK_SIZE = 120;

//
// DeckViewport
//

export type DeckViewportProps = PropsWithChildren;

/**
 * Deck viewport that renders the main content area and sets CSS variables for sidebar widths.
 */
export const DeckViewport = ({ children }: DeckViewportProps) => {
  const {
    state: { sidebarState, complementarySidebarState },
    settings,
    layoutMode,
  } = useDeckContext(DECK_VIEWPORT_NAME);

  const breakpoint = useBreakpoints();
  const topbar = layoutAppliesTopbar(breakpoint, layoutMode);

  return (
    <Main.Content
      bounce
      handlesFocus
      classNames={[
        'grid top-[env(safe-area-inset-top)]!',
        topbar && 'top-[calc(env(safe-area-inset-top)+var(--dx-rail-size))]!',
      ]}
      style={
        {
          '--main-spacing': settings?.encapsulatedPlanks ? '0.75rem' : '0',
          '--main-sidebar-width':
            sidebarState === 'expanded'
              ? 'var(--dx-nav-sidebar-size)'
              : sidebarState === 'collapsed'
                ? 'var(--dx-l0-size)'
                : '0',
          '--main-complementary-width':
            complementarySidebarState === 'expanded'
              ? 'var(--dx-complementary-sidebar-size)'
              : complementarySidebarState === 'collapsed'
                ? 'var(--dx-rail-size)'
                : '0',
        } as MainContentProps['style']
      }
    >
      {children}
    </Main.Content>
  );
};

DeckViewport.displayName = DECK_VIEWPORT_NAME;

//
// ContentEmpty
//

export const DeckContentEmpty = () => {
  const breakpoint = useBreakpoints();
  const { deck } = useDeckState();
  const layoutMode = getMode(deck);
  const topbar = layoutAppliesTopbar(breakpoint, layoutMode);
  return (
    <div className='grid place-items-center p-8 relative bg-deck-surface' data-testid='layoutPlugin.firstRunMessage'>
      <Surface.Surface type={Keyshortcuts} />
      {!topbar && <ToggleSidebarButton />}
    </div>
  );
};

//
// DeckSoloMode
//

/**
 * Single-plank layout with optional companion.
 */
export const DeckSoloMode = () => {
  const { deck, settings, layoutMode, onLayoutChange } = useDeckContext('DeckSoloMode');
  const { companionOpen, fullscreen, solo } = deck;
  const breakpoint = useBreakpoints();
  const topbar = layoutAppliesTopbar(breakpoint, layoutMode);
  invariant(solo);

  useEffect(() => {
    if (!fullscreen) {
      return;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onLayoutChange({ mode: 'solo--fullscreen' });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [fullscreen, onLayoutChange]);

  return (
    <div className='relative overflow-hidden bg-deck-surface'>
      <DeckSidebarToggles topbar={topbar} fullscreen={fullscreen} />
      {fullscreen && <ExitFullscreenButton onExit={() => onLayoutChange({ mode: 'solo--fullscreen' })} />}
      <DeckPlank
        id={solo}
        part='solo'
        layoutMode={layoutMode}
        companionShown={!fullscreen && companionOpen}
        settings={settings}
        classNames={mx('absolute inset-0', mainIntrinsicSize)}
      />
    </div>
  );
};

//
// DeckMultiMode
//

const getPlankId = (id: string) => id;

/**
 * Tile wrapping a {@link DeckPlank} in a resizable {@link Mosaic.Tile}; the committed width persists via
 * `plankSizing`. Reads the deck context directly since the Mosaic stack renders tiles by id.
 */
const DeckPlankTile: MosaicStackTileComponent<string> = (props) => {
  const id = props.data;
  const { deck, settings, layoutMode } = useDeckContext('DeckPlankTile');
  const { invokePromise } = useOperationInvoker();

  const handleSizeChange = useCallback<NonNullable<MosaicTileProps['onSizeChange']>>(
    (size) => {
      if (typeof size === 'number') {
        void invokePromise(DeckOperation.UpdatePlankSize, { id, size: Math.round(size) });
      }
    },
    [invokePromise, id],
  );

  return (
    <Mosaic.Tile
      {...props}
      classNames='relative h-full'
      size={deck.plankSizing[id] ?? DEFAULT_PLANK_SIZE}
      minSize={MIN_PLANK_SIZE}
      maxSize={MAX_PLANK_SIZE}
      onSizeChange={handleSizeChange}
    >
      <DeckPlank
        id={id}
        part='multi'
        layoutMode={layoutMode}
        active={deck.active}
        companionShown={deck.companionOpen}
        settings={settings}
        classNames='size-full'
      />
      <Mosaic.ResizeHandle />
    </Mosaic.Tile>
  );
};

/**
 * Multi-plank horizontal scrolling layout. Planks are resizable {@link Mosaic.Tile}s in a horizontal
 * {@link Mosaic.Stack}; the scroll position is preserved across solo↔multi transitions and the
 * just-navigated plank is scrolled into view.
 */
export const DeckMultiMode = () => {
  const { deck, layoutMode } = useDeckContext('DeckMultiMode');
  const { active, fullscreen } = deck;
  const { state } = useDeckState();
  const { invokePromise } = useOperationInvoker();
  const breakpoint = useBreakpoints();
  const topbar = layoutAppliesTopbar(breakpoint, layoutMode);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Preserve horizontal scroll position across solo↔multi transitions; a window resize invalidates it.
  const scrollLeftRef = useRef<number | null>(null);
  useEffect(
    () =>
      addEventListener(window, 'resize', () => {
        scrollLeftRef.current = null;
      }),
    [],
  );
  const restoreScroll = useCallback(() => {
    if (viewportRef.current && scrollLeftRef.current != null) {
      viewportRef.current.scrollLeft = scrollLeftRef.current;
    }
  }, []);
  useOnTransition(layoutMode, (mode) => mode !== 'multi', 'multi', restoreScroll);
  // Save scroll position as the user scrolls (ScrollArea.Viewport does not forward `onScroll`).
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    return addEventListener(viewport, 'scroll', () => {
      scrollLeftRef.current = viewport.scrollLeft;
    });
  }, []);

  // Scroll the just-navigated plank into view, then clear the one-shot flag.
  useEffect(() => {
    const id = state.scrollIntoView;
    const viewport = viewportRef.current;
    if (!id || !viewport) {
      return;
    }

    const tile = viewport.querySelector<HTMLElement>(`[data-object-id="${CSS.escape(id)}"]`);
    if (tile) {
      const offset = tile.getBoundingClientRect().left - viewport.getBoundingClientRect().left + viewport.scrollLeft;
      viewport.scrollTo({ left: offset, behavior: 'smooth' });
    }
    void invokePromise(LayoutOperation.ScrollIntoView, { subject: undefined });
  }, [state.scrollIntoView, invokePromise]);

  return (
    <div className='relative bg-deck-surface overflow-hidden'>
      <DeckSidebarToggles topbar={topbar} fullscreen={fullscreen} />
      <Mosaic.Container orientation='horizontal' classNames={['absolute inset-0', mainPaddingTransitions]}>
        <ScrollArea.Root orientation='horizontal' classNames='size-full'>
          <ScrollArea.Viewport ref={viewportRef}>
            <Mosaic.Stack
              orientation='horizontal'
              classNames='h-full gap-(--main-spacing) px-(--main-spacing)'
              getId={getPlankId}
              items={active}
              Tile={DeckPlankTile}
              draggable={false}
            />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Mosaic.Container>
    </div>
  );
};

//
// SidebarToggles
//

const sidebarToggleStyles = 'h-(--dx-rail-item) w-(--dx-rail-item) absolute bottom-2 z-[1] bg-deck-surface! lg:hidden';

const ToggleSidebarButton = () => <NaturalToggleSidebarButton classNames={mx(sidebarToggleStyles, 'left-2')} />;
const ToggleComplementarySidebarButton = () => (
  <NaturalToggleComplementarySidebarButton classNames={mx(sidebarToggleStyles, 'right-2')} />
);

const ExitFullscreenButton = ({ onExit }: { onExit: () => void }) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <div
      className={mx(
        'fixed top-2 right-2 z-[1]',
        hoverableControls,
        hoverableFocusedWithinControls,
        'transition-opacity opacity-(--controls-opacity)',
      )}
    >
      <IconButton
        label={t('exit-fullscreen.label')}
        icon='ph--corners-in--regular'
        iconOnly
        variant='ghost'
        tooltipSide='bottom'
        onClick={onExit}
      />
    </div>
  );
};

const DeckSidebarToggles = ({ topbar, fullscreen }: { topbar: boolean; fullscreen: boolean }) => {
  if (topbar || fullscreen) {
    return null;
  }

  return (
    <>
      <ToggleSidebarButton />
      <ToggleComplementarySidebarButton />
    </>
  );
};
