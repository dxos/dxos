//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useEffect, useRef } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { addEventListener } from '@dxos/async';
import { IconButton, Main, type MainContentProps, ScrollArea, useOnTransition, useTranslation } from '@dxos/react-ui';
import { mainIntrinsicSize, mainPaddingTransitions } from '@dxos/react-ui';
import { isLinkedSegment } from '@dxos/react-ui-attention';
import { Mosaic, type MosaicStackTileComponent, type MosaicTileProps } from '@dxos/react-ui-mosaic';
import { hoverableControls, hoverableFocusedWithinControls, mx } from '@dxos/ui-theme';

import {
  useBreakpoints,
  useCompanions,
  useDeckPresentation,
  useDeckState,
  useSelectedCompanion,
  useSelectedCompanionVariant,
} from '#hooks';
import { meta } from '#meta';
import { DeckOperation, Keyshortcuts } from '#types';

import { layoutAppliesTopbar } from '../../util';
import {
  ToggleComplementarySidebarButton as NaturalToggleComplementarySidebarButton,
  ToggleSidebarButton as NaturalToggleSidebarButton,
} from '../Sidebar';
import { DeckPlank } from './DeckPlank';
import { useDeckContext } from './DeckRoot';

const DECK_VIEWPORT_NAME = 'DeckViewport';

// Sliding-presentation plank extents (rem); each plank persists its own width via `plankSizing`.
const DEFAULT_PLANK_SIZE = 50;
const MIN_PLANK_SIZE = 20;
const MAX_PLANK_SIZE = 120;

// The companion plank persists a single shared width (keyed variant-independently) so switching
// companion tabs does not resize the pane. Not a valid node id, so it never collides with a plank.
const COMPANION_SIZE_KEY = 'companion';

//
// DeckViewport
//

export type DeckViewportProps = PropsWithChildren;

/**
 * Deck viewport that renders the main content area and sets CSS variables for sidebar widths.
 */
export const DeckViewport = ({ children }: DeckViewportProps) => {
  const {
    state: { sidebarState, complementarySidebarState, fullscreen },
    settings,
  } = useDeckContext(DECK_VIEWPORT_NAME);

  const breakpoint = useBreakpoints();
  const topbar = layoutAppliesTopbar(breakpoint, !!fullscreen);

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
  const { state } = useDeckState();
  const topbar = layoutAppliesTopbar(breakpoint, !!state.fullscreen);
  return (
    <div className='grid place-items-center p-8 relative bg-deck-surface' data-testid='layoutPlugin.firstRunMessage'>
      <Surface.Surface type={Keyshortcuts} />
      {!topbar && <ToggleSidebarButton />}
    </div>
  );
};

//
// DeckPlanks
//

const getPlankId = (id: string) => id;

/**
 * The planks the deck renders: the real active planks plus, when the companion is open, the derived
 * trailing companion plank of the last plank (`<lastPlank>/~<variant>`). The companion is never stored
 * in `deck.active` — it always follows the current last plank — so it is derived here and rendered as
 * an ordinary plank. `companionId` is the trailing entry, or undefined when no companion is shown.
 */
const useRenderedPlanks = (): { rendered: string[]; companionId: string | undefined } => {
  const { deck } = useDeckContext('useRenderedPlanks');
  const lastPlank = deck.active[deck.active.length - 1];
  const companions = useCompanions(lastPlank ?? '');
  const selectedVariant = useSelectedCompanionVariant();
  const { companionId } = useSelectedCompanion(companions, selectedVariant);
  const companion = deck.companionOpen && lastPlank ? companionId : undefined;
  return { rendered: companion ? [...deck.active, companion] : deck.active, companionId: companion };
};

/**
 * Tile wrapping a {@link DeckPlank}, parameterized by the derived presentation: fullbleed renders an
 * absolutely-positioned plank with no resize affordance (today's solo look); sliding renders a
 * resizable {@link Mosaic.Tile} whose committed width persists via `plankSizing`, full-viewport-width
 * and scroll-snapped below the `md` breakpoint. Reads the deck context directly since the Mosaic stack
 * renders tiles by id. Passes the real `deck.active` (not the rendered list) to {@link DeckPlank} so
 * ordering and the "open companion" affordance key off real planks, and `soloLook` off the rendered count.
 */
const DeckPlankTile: MosaicStackTileComponent<string> = (props) => {
  const id = props.data;
  const { deck } = useDeckContext('DeckPlankTile');
  const { invokePromise } = useOperationInvoker();
  const breakpoint = useBreakpoints();
  const { rendered } = useRenderedPlanks();
  const presentation = useDeckPresentation(rendered.length);
  const isMobile = breakpoint === 'mobile';
  const soloLook = rendered.length === 1;
  // The companion plank keeps one shared width across its variants (a companion id is
  // `<plank>/~<variant>`), so switching tabs never resizes it; ordinary planks size per id.
  const sizingKey = isLinkedSegment(id) ? COMPANION_SIZE_KEY : id;

  const handleSizeChange = useCallback<NonNullable<MosaicTileProps['onSizeChange']>>(
    (size) => {
      if (typeof size === 'number') {
        void invokePromise(DeckOperation.UpdatePlankSize, { id: sizingKey, size: Math.round(size) });
      }
    },
    [invokePromise, sizingKey],
  );

  if (presentation === 'fullbleed') {
    return (
      <Mosaic.Tile {...props} classNames='relative h-full w-full'>
        <DeckPlank
          id={id}
          part='main'
          active={deck.active}
          soloLook={soloLook}
          classNames={mx('absolute inset-0', mainIntrinsicSize)}
        />
      </Mosaic.Tile>
    );
  }

  // Mobile planks are fixed full-viewport-width scroll-snap points, not user-resizable.
  if (isMobile) {
    return (
      <Mosaic.Tile {...props} classNames='relative h-full w-full snap-start'>
        <DeckPlank id={id} part='main' active={deck.active} soloLook={soloLook} classNames='size-full' />
      </Mosaic.Tile>
    );
  }

  return (
    <Mosaic.Tile
      {...props}
      classNames='relative h-full'
      size={deck.plankSizing[sizingKey] ?? DEFAULT_PLANK_SIZE}
      minSize={MIN_PLANK_SIZE}
      maxSize={MAX_PLANK_SIZE}
      onSizeChange={handleSizeChange}
    >
      <DeckPlank id={id} part='main' active={deck.active} soloLook={soloLook} classNames='size-full' />
      <Mosaic.ResizeHandle />
    </Mosaic.Tile>
  );
};

/**
 * Renders `deck.active` through a single {@link Mosaic.Container} > {@link ScrollArea} >
 * {@link Mosaic.Stack} pipeline, parameterized by the derived presentation (fullbleed for a
 * singleton deck, sliding for two or more, always sliding below the `md` breakpoint). Planks stay
 * mounted in the same {@link Mosaic.Stack} across 1↔2 transitions — only their tile styling changes,
 * so opening a second plank (or closing the second-to-last) never remounts a plank's content.
 *
 * Fullscreen is a transient overlay independent of `active`, driven by `EphemeralDeckState.fullscreen`:
 * it renders only that plank, headless, replacing the deck entirely until the user exits (Escape or
 * the fullscreen toggle), matching the existing `DeckOperation.Adjust({ type: 'fullscreen' })` wiring.
 */
export const DeckPlanks = () => {
  const { state } = useDeckContext('DeckPlanks');
  const { rendered } = useRenderedPlanks();
  const { invokePromise } = useOperationInvoker();
  const breakpoint = useBreakpoints();
  const presentation = useDeckPresentation(rendered.length);
  const fullscreenId = state.fullscreen;
  const fullscreen = !!fullscreenId;
  const topbar = layoutAppliesTopbar(breakpoint, fullscreen);
  const viewportRef = useRef<HTMLDivElement>(null);
  const isSliding = presentation === 'sliding';

  // Preserve horizontal scroll position across fullbleed↔sliding transitions; a window resize
  // invalidates it.
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
  useOnTransition(isSliding, (value) => !value, true, restoreScroll);
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

  const toggleFullscreen = useCallback(() => {
    if (!fullscreenId) {
      return;
    }
    void invokePromise(DeckOperation.Adjust, { type: 'fullscreen' as const, id: fullscreenId });
  }, [invokePromise, fullscreenId]);

  useEffect(() => {
    if (!fullscreen) {
      return;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        toggleFullscreen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [fullscreen, toggleFullscreen]);

  return (
    <div className='relative bg-deck-surface overflow-hidden'>
      <DeckSidebarToggles topbar={topbar} fullscreen={fullscreen} />
      {fullscreen && fullscreenId ? (
        <>
          <ExitFullscreenButton onExit={toggleFullscreen} />
          <DeckPlank id={fullscreenId} part='main' fullscreen classNames={mx('absolute inset-0', mainIntrinsicSize)} />
        </>
      ) : presentation === 'fullbleed' && rendered[0] ? (
        // A singleton deck renders the plank directly as an absolute-inset child of this filled
        // container (today's solo look). Routing it through the horizontal Mosaic.Stack/ScrollArea
        // collapses it — an `absolute inset-0` plank contributes no intrinsic size to a flex tile.
        <DeckPlank
          id={rendered[0]}
          part='main'
          active={rendered}
          soloLook
          classNames={mx('absolute inset-0', mainIntrinsicSize)}
        />
      ) : (
        <Mosaic.Container orientation='horizontal' classNames={['absolute inset-0', mainPaddingTransitions]}>
          <ScrollArea.Root orientation='horizontal' classNames='size-full'>
            <ScrollArea.Viewport ref={viewportRef} classNames={breakpoint === 'mobile' && 'snap-x snap-mandatory'}>
              <Mosaic.Stack
                orientation='horizontal'
                // Fullbleed and mobile are edge-to-edge by design; the `--main-spacing` gap/padding
                // (which encapsulates each plank in its own container) only applies to the desktop
                // sliding deck, matching today's multi-mode look.
                classNames={
                  isSliding && breakpoint !== 'mobile' ? 'h-full gap-(--main-spacing) px-(--main-spacing)' : 'h-full'
                }
                getId={getPlankId}
                items={rendered}
                Tile={DeckPlankTile}
                draggable={false}
              />
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Mosaic.Container>
      )}
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
