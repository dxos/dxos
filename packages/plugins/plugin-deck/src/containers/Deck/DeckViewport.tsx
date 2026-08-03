//
// Copyright 2026 DXOS.org
//

import React, {
  type CSSProperties,
  type MouseEvent,
  type PropsWithChildren,
  type RefObject,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { addEventListener } from '@dxos/async';
import { useNode } from '@dxos/plugin-graph/hooks';
import {
  IconButton,
  Main,
  type MainContentProps,
  ScrollArea,
  type ThemedClassName,
  toLocalizedString,
  useOnTransition,
  useTranslation,
} from '@dxos/react-ui';
import { mainIntrinsicSize, mainPaddingTransitions } from '@dxos/react-ui';
import { Attention, useAttended, useAttentionContext } from '@dxos/react-ui-attention';
import { Mosaic, type MosaicStackTileComponent, type MosaicTileProps } from '@dxos/react-ui-mosaic';
import { hoverableControls, hoverableFocusedWithinControls, mx } from '@dxos/ui-theme';

import { FoldSpine, SPINE_PX } from '#components';
import { useBreakpoints, useDeckPresentation, useDeckSettings, useDeckState } from '#hooks';
import { meta } from '#meta';
import { DeckOperation, Keyshortcuts } from '#types';

import { findAttendedPlank, getRenderedPlanks, layoutAppliesTopbar } from '../../util';
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

const REM_PX = 16;

/** Duration of the per-plank morph into and out of the exposé (see {@link useExposeFlip}). */
const EXPOSE_ZOOM_MS = 150;

/** Breathing room between the exposé's tiles and the viewport edges, on every side. */
const EXPOSE_INSET_PX = 24;

/**
 * Gutter inset *within* each exposé tile, so a miniature reads as its own card rather than butting against
 * its neighbours — the deck's own `--main-spacing` gap is scaled down with everything else and all but
 * disappears. Padding rather than margin, so with `border-box` the tile's width (and hence the scale the
 * row is fitted at) is untouched.
 */
const EXPOSE_GUTTER_PX = 32;

/** Slack after the zoom before the deck's geometry is re-read, covering the transition's own jitter. */
const EXPOSE_SETTLE_MARGIN_MS = 60;

// Gap/padding that encapsulates each plank in its own container (the `--main-spacing` CSS var); tweak
// here to change the deck's plank spacing.
const PLANK_SPACING_REM = 0.75;
const PLANK_SPACING = `${PLANK_SPACING_REM}rem`;

// EXPERIMENT (stacked notes): while sliding, planks are sticky and pile on the left as you scroll.
// Each pinned plank reveals a `SPINE_PX`-wide sliver (owned by `FoldSpine`, which draws it); once a
// plank's visible width drops below `FOLD_THRESHOLD_PX` (no room for its header) it folds to a spine.
// A plank folds to its spine once the sliver still showing narrows below a spine plus the inter-plank
// gap — i.e. just as it would otherwise tuck fully behind its neighbor.
const FOLD_THRESHOLD_PX = SPINE_PX + PLANK_SPACING_REM * REM_PX;

type PlankContextValue = RenderedPlanks & {
  /**
   * Upper bound (px) on a sliding plank's width, measured from the viewport so the current plank's
   * trailing controls never disappear behind the piled spines of the other planks. Infinity until measured.
   */
  maxPlankWidthPx: number;
  /** Records the tiles' geometry for the exposé transition; call before toggling it. See {@link useExposeFlip}. */
  captureExposeGeometry: () => void;
};

/**
 * What a plank tile needs from the deck around it. A context rather than props because `Mosaic.Stack`
 * instantiates the tile itself, passing a closed prop set with no consumer passthrough — and building the
 * tile component inline would give it a new identity per measurement, remounting every plank on each
 * resize. Not deck state: the measurements are meaningless outside this subtree, and routing them
 * through the shared ephemeral atom would re-render every other `useDeckState` consumer per resize frame;
 * the rendered-plank shape rides along so the tiles resolve it once instead of each subscribing to
 * attention themselves.
 */
const PlankContext = createContext<PlankContextValue>({
  planks: [],
  attendedPlankId: undefined,
  maxPlankWidthPx: Number.POSITIVE_INFINITY,
  captureExposeGeometry: () => {},
});

const usePlankContext = () => useContext(PlankContext);

//
// DeckViewport
//

export type DeckViewportProps = ThemedClassName<PropsWithChildren>;

/**
 * Deck viewport that renders the main content area and sets CSS variables for sidebar widths.
 */
export const DeckViewport = ({ children, classNames }: DeckViewportProps) => {
  const {
    state: { sidebarState, complementarySidebarState, fullscreen },
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
        classNames,
      ]}
      style={
        {
          '--main-spacing': PLANK_SPACING,
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

type RenderedPlanks = {
  /** The real planks the deck lays out (`flatten` collapses these to the current plank). */
  planks: string[];
  /** The plank attention points into, or undefined when it points outside the deck. */
  attendedPlankId: string | undefined;
};

/**
 * What the deck renders: the real active planks. Companions live in the complementary sidebar, so
 * nothing here widens a tile and attention plays no part in what is laid out.
 *
 * When the `flatten` setting is on, only the current (last) active plank renders, so
 * the deck stays fullbleed/tiling; the earlier active entries are surfaced as breadcrumbs in the plank
 * heading instead of as open planks.
 */
const useRenderedPlanks = (): RenderedPlanks => {
  const { deck } = useDeckContext('useRenderedPlanks');
  const { flatten } = useDeckSettings();
  const attended = useAttended();
  const planks = useMemo(() => getRenderedPlanks(deck.active, flatten), [flatten, deck.active]);
  // Resolved once here: the attended plank is what the click-to-front and arrow navigation key off.
  const attendedPlankId = findAttendedPlank(planks, attended);

  // Stable identity: this shape is the `PlankContext` value, so a new object per render would re-render
  // every tile on every deck render.
  return useMemo(() => ({ planks, attendedPlankId }), [planks, attendedPlankId]);
};

/**
 * The viewport-derived cap on a tile, in rem: never below the tile's own minimum, never above the
 * absolute plank maximum.
 */
const resolveMaxTileSize = (maxPlankWidthPx: number): number =>
  Math.max(MIN_PLANK_SIZE, Math.min(MAX_PLANK_SIZE, maxPlankWidthPx / REM_PX));

/**
 * Width (rem) of a sliding tile: the plank's own stored width, capped by the viewport-derived bound so
 * its trailing controls stay clear of the piled spines.
 */
const resolveTileSize = (plankSizing: Record<string, number>, id: string, maxSize: number): number =>
  Math.min(plankSizing[id] ?? DEFAULT_PLANK_SIZE, maxSize);

//
// DeckPlankTile
//

// Fades a tile's content out while folded (crossfading with the spine) so a wide plank never occludes the
// plank in view. The `dx-fold-content` hook lets stories retime/restyle the transition.
const FOLD_CONTENT_CLASSNAMES =
  'dx-fold-content size-full transition-opacity duration-200 ease-out group-data-[folded]/tile:pointer-events-none group-data-[folded]/tile:opacity-0 group-data-[fold-instant]/tile:transition-none';

/**
 * Tile wrapping a {@link DeckPlank}, parameterized by the derived presentation: fullbleed renders an
 * absolutely-positioned plank with no resize affordance (today's solo look); sliding renders a
 * resizable {@link Mosaic.Tile} whose committed width persists via `plankSizing`, full-viewport-width
 * and scroll-snapped below the `md` breakpoint. Reads the deck context directly since the Mosaic stack
 * renders tiles by id. Passes the real `deck.active` (not the rendered list) to {@link DeckPlank} so
 * ordering and the solo/multi mode both key off real planks.
 */
const DeckPlankTile: MosaicStackTileComponent<string> = (props) => {
  const id = props.data;
  const { deck, state } = useDeckContext('DeckPlankTile');
  const { invokePromise } = useOperationInvoker();
  const { graph } = useAppGraph();
  const node = useNode(graph, id);
  const breakpoint = useBreakpoints();
  const { planks: rendered, maxPlankWidthPx, captureExposeGeometry } = usePlankContext();
  const presentation = useDeckPresentation(rendered.length);
  const isMobile = breakpoint === 'mobile';
  const exposed = !!state.expose;
  // Stacking (experiment): each plank is `position: sticky` on both edges (see the style below) so the
  // browser pins scrolled-past planks into the left pile and not-yet-reached planks into the right pile
  // natively — no per-frame JS repin, so the spines stay stable and opaque. The folded spine's sigil
  // mirrors the plank header's icon; DeckPlanks only toggles the fold state (never the pinning).
  const index = rendered.indexOf(id);
  // Resolve the node's (possibly localized) label the same way the plank heading does, falling back to
  // the id only when there is no label at all.
  const { t } = useTranslation(meta.profile.key);
  const spineLabel = toLocalizedString(node?.properties?.label ?? '', t) || id;
  const spineIcon = typeof node?.properties.icon === 'string' ? node.properties.icon : 'ph--circle-dashed--regular';
  // Clamp the tile to the viewport-derived cap so its trailing controls stay clear of the piled spines;
  // the cap only ever shrinks the stored width, so widths are restored when the viewport grows.
  const maxSize = resolveMaxTileSize(maxPlankWidthPx);
  const storedSize = resolveTileSize(deck.plankSizing, id, maxSize);
  // Expanded takes the whole cap, which is by construction the viewport less a spine for every other
  // plank — exactly the space between the two piles.
  const tileSize = state.expanded === id ? maxSize : storedSize;
  const tileWidthPx = tileSize * REM_PX;

  const handleSizeChange = useCallback<NonNullable<MosaicTileProps['onSizeChange']>>(
    (size) => {
      if (typeof size === 'number') {
        void invokePromise(DeckOperation.UpdatePlankSize, { id, size });
        // Dragging is the user choosing a width, which is the opposite of expanded — otherwise the tile
        // would snap straight back to the cap.
        if (state.expanded === id) {
          void invokePromise(DeckOperation.Adjust, { type: 'expand' as const, id });
        }
      }
    },
    [invokePromise, id, state.expanded],
  );

  // Picking a plank in the exposé is a navigation: leave the overview and bring the chosen plank forward.
  const handleExposeSelect = useCallback(() => {
    captureExposeGeometry();
    void invokePromise(DeckOperation.ToggleExpose, { expose: false });
    void invokePromise(LayoutOperation.ScrollIntoView, { subject: id });
  }, [invokePromise, id, captureExposeGeometry]);

  if (presentation === 'fullbleed') {
    return (
      <Mosaic.Tile {...props} classNames='relative h-full w-full'>
        <DeckPlank id={id} part='main' active={deck.active} classNames={mx('absolute inset-0', mainIntrinsicSize)} />
      </Mosaic.Tile>
    );
  }

  // Mobile planks are fixed full-viewport-width scroll-snap points, not user-resizable.
  if (isMobile) {
    return (
      <Mosaic.Tile {...props} classNames='relative h-full w-full snap-start'>
        <DeckPlank id={id} part='main' active={deck.active} classNames='size-full' />
      </Mosaic.Tile>
    );
  }

  return (
    <Mosaic.Tile
      {...props}
      // Faint leading-edge shadow so a plank reads as sitting on top of the one behind it as they slide
      // over each other (planks stack by z-index; each one's left edge overlaps its left neighbor).
      classNames={mx(
        'group/tile relative h-full shadow-[-6px_0_16px_-8px_rgba(0,0,0,0.45)]',
        exposed && 'p-(--deck-expose-gutter)',
      )}
      size={tileSize}
      minSize={MIN_PLANK_SIZE}
      maxSize={maxSize}
      onSizeChange={handleSizeChange}
      // Native two-edge sticky (the notes.andymatuschak.org pattern): a positive per-index start inset
      // builds the left pile; a *negative* end inset lets the plank slide fully off the right edge and
      // pin only once a spine's worth remains, building the right pile — both handled by the browser, so
      // the spines never flicker. z-order stacks later planks above earlier so right spines read on top.
      //
      // The exposé drops the pinning entirely: sticky resolves against the scrollport in the scaled
      // coordinate space, so leaving it on would pile planks that the exposé means to lay out flat.
      style={
        exposed
          ? { position: 'relative', zIndex: index + 1 }
          : {
              position: 'sticky',
              insetInlineStart: `${index * SPINE_PX}px`,
              insetInlineEnd: `${(rendered.length - index) * SPINE_PX - tileWidthPx}px`,
              zIndex: index + 1,
            }
      }
    >
      {/* Fades out while folded (crossfading with the spine) so a wide plank never occludes the plank in
          view. The `dx-fold-content` hook lets stories retime/restyle the transition. */}
      <DeckPlank
        id={id}
        part='main'
        active={deck.active}
        classNames={mx(FOLD_CONTENT_CLASSNAMES, exposed && 'pointer-events-none')}
      />
      {/* The exposé's hit target, covering the plank so a click picks the tile rather than landing in a
          miniature editor. Also its frame: at exposé scale a plank is dark content on the equally dark
          deck surface, and the outline is what makes it read as a tile at all. */}
      {exposed && (
        <button
          className='absolute inset-(--deck-expose-gutter) z-10 cursor-pointer rounded-sm outline outline-separator transition-colors hover:outline-accentSurface'
          aria-label={spineLabel}
          onClick={handleExposeSelect}
        />
      )}
      {/* Returning the plank to view is the same one-shot as a navigation scroll, so it goes through the
          operation rather than a second scroll path — which also attends it, since the plank focuses
          itself off that flag. */}
      <FoldSpine
        icon={spineIcon}
        label={spineLabel}
        onClick={() => void invokePromise(LayoutOperation.ScrollIntoView, { subject: id })}
      />
      <Mosaic.ResizeHandle />
    </Mosaic.Tile>
  );
};

//
// DeckPlanks geometry
//
// Each concern below is a named hook rather than an inline effect: the deck's stacking geometry is read
// from the DOM in several independent passes, and naming them keeps `DeckPlanks` a readable sequence.
//

/**
 * The deck's own plank tiles — the *direct* children of the Mosaic stack. Scoping to them keeps nested
 * `role="listitem"` content (CRM lists, markdown bullets, embedded mosaics) out of the fold and scroll
 * geometry; otherwise a plank whose content contains list items measures wrong, folds spuriously, and
 * sticks as a spine.
 */
const usePlankTiles = (stackRef: RefObject<HTMLDivElement | null>) =>
  useCallback(
    () => Array.from(stackRef.current?.querySelectorAll<HTMLElement>(':scope > [role="listitem"]') ?? []),
    [stackRef],
  );

/**
 * Caps a sliding plank's width to exactly the gap the two piles leave it: the viewport, less one spine
 * for every other plank (the pile insets are one spine apart, gapless, whichever side they pin to), less
 * the single gap between this plank and its neighbour, less the stack's own padding.
 *
 * The exactness matters. Reserving any more leaves the plank after the current one short of its own pin
 * position — sticky pins, it never pushes — so instead of folding to a spine it wedges a part-drawn
 * header against the current plank. A plank at
 * the front therefore spans precisely up to where the trailing pile begins.
 *
 * A layout effect, so the cap lands before first paint — no flash of full-width planks on load.
 */
const useMaxPlankWidth = ({
  viewportRef,
  stackRef,
  isSliding,
  plankCount,
}: {
  viewportRef: RefObject<HTMLDivElement | null>;
  stackRef: RefObject<HTMLDivElement | null>;
  isSliding: boolean;
  plankCount: number;
}): { maxPlankWidthPx: number; viewportWidthPx: number } => {
  const [measured, setMeasured] = useState({
    maxPlankWidthPx: Number.POSITIVE_INFINITY,
    viewportWidthPx: 0,
  });

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !isSliding) {
      setMeasured({ maxPlankWidthPx: Number.POSITIVE_INFINITY, viewportWidthPx: 0 });
      return;
    }
    const measure = () => {
      const stack = stackRef.current;
      const styles = stack && getComputedStyle(stack);
      const gap = styles ? parseFloat(styles.columnGap) || 0 : 0;
      // Only the leading padding: any trailing padding is the overscroll runway, which is deliberately
      // outside the plank's budget rather than space it has to fit within.
      const padding = styles ? parseFloat(styles.paddingInlineStart) || 0 : 0;
      const others = Math.max(0, plankCount - 1);
      const max = viewport.clientWidth - padding - others * SPINE_PX - (others > 0 ? gap : 0);
      setMeasured({
        maxPlankWidthPx: max > 0 ? max : Number.POSITIVE_INFINITY,
        viewportWidthPx: viewport.clientWidth,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [isSliding, plankCount, viewportRef, stackRef]);

  return measured;
};

/**
 * Preserves horizontal scroll position across fullbleed↔sliding transitions; a window resize invalidates
 * it. The scroll listener is explicit because `ScrollArea.Viewport` does not forward `onScroll`.
 */
const usePreservedScroll = ({
  viewportRef,
  isSliding,
}: {
  viewportRef: RefObject<HTMLDivElement | null>;
  isSliding: boolean;
}) => {
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
  }, [viewportRef]);
  useOnTransition(isSliding, (value) => !value, true, restoreScroll);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    return addEventListener(viewport, 'scroll', () => {
      scrollLeftRef.current = viewport.scrollLeft;
    });
  }, [viewportRef]);
};

/**
 * Fold detection (experiment): pinning is entirely native CSS `sticky` (see the tile style), so this
 * never repositions anything — it only reads the already-pinned rects to decide when a plank has
 * collapsed to a sliver, then shows its spine on the edge it pinned to. Reading stable positions means
 * the spines never lag or flicker during a scroll. It also keeps attention on a plank the user can see.
 */
const useFoldedPlanks = ({
  viewportRef,
  getPlankTiles,
  isSliding,
  expose,
  plankCount,
  maxPlankWidthPx,
  scrollIntentRef,
}: {
  viewportRef: RefObject<HTMLDivElement | null>;
  getPlankTiles: () => HTMLElement[];
  isSliding: boolean;
  expose: boolean;
  plankCount: number;
  maxPlankWidthPx: number;
  scrollIntentRef: RefObject<string | undefined>;
}) => {
  const { attention } = useAttentionContext(DECK_VIEWPORT_NAME);
  const wasExposedRef = useRef(expose);

  // A layout effect: the first `update()` has to stamp `data-folded` before paint. As a passive effect
  // the browser painted the planks unfolded first, so returning from the exposé flashed their full
  // backgrounds before the spines took over.
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !isSliding) {
      return;
    }

    // Crossing the exposé boundary refolds every plank at once, and the fold is a 200ms crossfade — long
    // enough that the planks are painted over the spines replacing them. Flagging the tiles in the same
    // task as the fold stamp means the browser resolves both together and skips the transition; the flag
    // comes off two frames later, once the new opacity has been painted, so the ordinary fold still
    // animates. Anything else here (a scroll, a resize) keeps its crossfade.
    const exposeTiles = getPlankTiles();
    const crossedExpose = wasExposedRef.current !== expose;
    if (crossedExpose) {
      wasExposedRef.current = expose;
      exposeTiles.forEach((tile) => tile.toggleAttribute('data-fold-instant', true));
      requestAnimationFrame(() =>
        requestAnimationFrame(() => exposeTiles.forEach((tile) => tile.removeAttribute('data-fold-instant'))),
      );
    }

    // Nothing is folded in the exposé — every plank is visible at once — and the rects are scaled, so
    // measuring would stamp nonsense. Clearing the attribute unfolds them; the restamp on the way out is
    // this same effect re-running as `expose` flips back, still before paint.
    if (expose) {
      exposeTiles.forEach((tile) => tile.removeAttribute('data-folded'));
      return;
    }

    // Leaving the exposé restores a deck the user never navigated, so the plank they were attending is
    // still the right one — the hysteresis only exists to rescue attention from a plank that scrolled out
    // of view, which is not what happened here.
    let keepAttention = crossedExpose;
    // ...and it must hold for the whole zoom, not just this pass. The scroll restore fires its event a
    // task later, and every frame of the zoom reports scaled rects, so an unguarded `update()` would read
    // the attended plank as folded and hand attention to whichever plank happens to be near the middle.
    // Nothing measures until the deck has settled, at which point one final pass takes the true geometry.
    let settling = false;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      if (settling) {
        return;
      }
      const tiles = getPlankTiles();
      const vpRect = viewport.getBoundingClientRect();
      const rects = tiles.map((tile) => tile.getBoundingClientRect());
      const folded = tiles.map((tile, index) => {
        // A plank's spine is the sliver from its left edge to the next plank's left edge (the last plank,
        // uncovered, uses its own visible width); fold once that sliver is too narrow for the header.
        const rect = rects[index];
        const coverLeft = rects[index + 1]?.left ?? Math.min(rect.right, vpRect.right);
        const uncovered = coverLeft - rect.left;
        const isFolded = uncovered > 0 && uncovered < FOLD_THRESHOLD_PX;
        tile.toggleAttribute('data-folded', isFolded);
        // Which pile the plank pinned to, so the fold animation can travel in the plank's own direction:
        // `start` for the left pile (moving toward the start), `end` for the right pile.
        tile.setAttribute('data-fold-side', rect.left - vpRect.left < vpRect.width / 2 ? 'start' : 'end');
        return isFolded;
      });

      const offscreen = (rect: DOMRect) => rect.right <= vpRect.left || rect.left >= vpRect.right;

      // A plank the user asked to see (a spine click, or a navigation) is focused as soon as the scroll
      // starts, while it is still folded in the pile. Hold that focus until the plank has actually
      // arrived — otherwise the hysteresis below reads it as "attended but folded" on the first scroll
      // frame and hands attention straight back to whichever plank is already on screen.
      const intent = scrollIntentRef.current;
      if (intent) {
        const intentIndex = tiles.findIndex((tile) => tile.getAttribute('data-object-id') === intent);
        const arrived = intentIndex === -1 || (!folded[intentIndex] && !offscreen(rects[intentIndex]));
        if (!arrived) {
          return;
        }
        scrollIntentRef.current = undefined;
      }

      if (keepAttention) {
        return;
      }

      // Attention hysteresis: attention must always point at a plank the user can see. It moves only
      // when the attended plank has folded to a spine (or left the viewport entirely — the mobile snap
      // case, where tiles are not sticky), and then to the unfolded plank nearest the viewport center,
      // so focus never twitches while the attended plank remains visible.
      const [attendedId] = attention?.getCurrent() ?? [];
      const attendedIndex = attendedId
        ? tiles.findIndex((tile) => {
            const id = tile.getAttribute('data-object-id');
            return !!id && (attendedId === id || attendedId.startsWith(`${id}/`));
          })
        : -1;
      if (attendedIndex !== -1 && (folded[attendedIndex] || offscreen(rects[attendedIndex]))) {
        const vpCenter = vpRect.left + vpRect.width / 2;
        let best: { tile: HTMLElement; distance: number } | undefined;
        tiles.forEach((tile, index) => {
          const id = tile.getAttribute('data-object-id');
          if (!id || folded[index] || offscreen(rects[index])) {
            return;
          }
          const distance = Math.abs((rects[index].left + rects[index].right) / 2 - vpCenter);
          if (!best || distance < best.distance) {
            best = { tile, distance };
          }
        });
        // Attention is focus-driven, so move focus to the plank rather than setting attention directly;
        // `preventScroll` stops the focus call from fighting the scroll that triggered it.
        const plank = best?.tile.querySelector<HTMLElement>(Attention.ATTENDABLE_SELECTOR);
        if (plank && !plank.contains(document.activeElement)) {
          plank.focus({ preventScroll: true });
        }
      }
    };
    // Runs before the zoom starts, so these rects are the deck's real geometry and the spines are correct
    // from the first painted frame.
    update();
    if (crossedExpose) {
      settling = true;
      settleTimer = setTimeout(() => {
        settling = false;
        update();
        // Only now does the hysteresis resume: the settled pass has to leave attention alone too, or it
        // enforces "attention must be on a visible plank" against a deck the user never scrolled and
        // walks attention off a plank that was folded before the exposé opened.
        keepAttention = false;
      }, EXPOSE_ZOOM_MS + EXPOSE_SETTLE_MARGIN_MS);
    } else {
      keepAttention = false;
    }
    const offScroll = addEventListener(viewport, 'scroll', update);
    const offResize = addEventListener(window, 'resize', update);
    return () => {
      clearTimeout(settleTimer);
      offScroll();
      offResize();
    };
    // `maxPlankWidthPx` is a dep so the fold state recomputes when the width cap shrinks planks (else a
    // plank folded against its pre-cap width leaves a spine floating until the next scroll).
  }, [isSliding, expose, plankCount, maxPlankWidthPx, getPlankTiles, attention, viewportRef, scrollIntentRef]);
};

/**
 * The last scroll this module commanded per viewport, so a burst of re-runs settling one interaction
 * does not restart the smooth animation repeatedly. Keyed weakly: the entry dies with the viewport.
 */
const lastScrollCommand = new WeakMap<HTMLElement, { left: number; at: number }>();

/** Window in which a repeat command to the same destination is treated as the same scroll. */
const SCROLL_DEDUPE_MS = 600;

/**
 * How long a click waits before bringing its plank forward, giving a navigation the same gesture
 * triggers time to claim it. Long enough for an operation round trip, short enough to read as instant.
 */
const CLICK_TO_FRONT_DELAY_MS = 150;

/**
 * Scrolls a plank flush against the left pile — the deck's one notion of "bring this plank to the front",
 * shared by navigation, a folded spine returning its plank to view, and attention moving between planks.
 *
 * The offset can't come from the tile's rect or `offsetLeft`: while sliding the tiles are
 * `position: sticky`, so both report the pinned position (clustered for planks in a pile). Summing the
 * preceding plank widths and gaps gives the natural offset instead, and backing off one spine per
 * preceding plank leaves the target just past the left pile.
 */
const scrollPlankToPile = ({
  viewport,
  stack,
  tiles,
  index,
  force = false,
}: {
  viewport: HTMLDivElement;
  stack: HTMLDivElement;
  tiles: HTMLElement[];
  index: number;
  /** Bypass the repeat-command dedupe — for the arrival watchdog, whose whole job is re-issuing. */
  force?: boolean;
}) => {
  const styles = getComputedStyle(stack);
  const gap = parseFloat(styles.columnGap) || 0;
  // The logical property, so this and `useMaxPlankWidth` read the same inset.
  let naturalLeft = parseFloat(styles.paddingInlineStart) || 0;
  for (let plank = 0; plank < index; plank++) {
    naturalLeft += tiles[plank].offsetWidth + gap;
  }
  const left = Math.max(0, naturalLeft - index * SPINE_PX);

  // The collapse legitimately re-runs while one interaction settles — attention lands, the layout
  // resolves a commit later, the width cap recomputes — and each `scrollTo` *restarts* the smooth
  // animation rather than continuing it, so repeats to the same destination read as a stutter. Opening
  // a layout change measured six commands to one target inside 30ms.
  const previous = lastScrollCommand.get(viewport);
  const now = performance.now();
  if (!force && previous && previous.left === left && now - previous.at < SCROLL_DEDUPE_MS) {
    return left;
  }
  lastScrollCommand.set(viewport, { left, at: now });

  viewport.scrollTo({ left, behavior: 'smooth' });
  return left;
};

/** Scrolls a plank into view for the one-shot navigation flag, then clears it. */
const useScrollIntoView = ({
  viewportRef,
  stackRef,
  getPlankTiles,
  scrollIntoViewId,
  scrollIntentRef,
}: {
  viewportRef: RefObject<HTMLDivElement | null>;
  stackRef: RefObject<HTMLDivElement | null>;
  getPlankTiles: () => HTMLElement[];
  scrollIntoViewId: string | undefined;
  scrollIntentRef: RefObject<string | undefined>;
}) => {
  const { invokePromise } = useOperationInvoker();
  // Outlives the effect on purpose: the effect clears the one-shot flag, which re-runs it with no id —
  // a cleanup there would kill the watchdog the moment it was armed.
  const watchdogRef = useRef<number | undefined>(undefined);

  useEffect(() => () => cancelAnimationFrame(watchdogRef.current ?? 0), []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const stack = stackRef.current;
    if (!scrollIntoViewId || !viewport || !stack) {
      return;
    }

    const tiles = getPlankTiles();
    const index = tiles.findIndex((tile) => tile.getAttribute('data-object-id') === scrollIntoViewId);
    if (index !== -1) {
      // The plank focuses itself off the same one-shot flag; record it so the fold hysteresis holds that
      // focus until the scroll below has actually brought the plank out of the pile.
      scrollIntentRef.current = scrollIntoViewId;
      const target = scrollPlankToPile({ viewport, stack, tiles, index });

      // Arrival watchdog. A smooth scroll is a request, not a guarantee: a reflow mid-glide — a plank
      // remounting, a list re-rendering, the scrollable width momentarily collapsing — makes the browser
      // clamp or abort it, stranding the deck wherever the abort happened (measured in the app: the
      // command was issued and the deck never moved). Arrival is owned by `useFoldedPlanks`, which
      // clears the intent; until then, a deck that sits still without arriving gets the command again.
      cancelAnimationFrame(watchdogRef.current ?? 0);
      let attempts = 0;
      let last = viewport.scrollLeft;
      let still = 0;
      const watch = () => {
        if (scrollIntentRef.current !== scrollIntoViewId || attempts >= 2) {
          return;
        }
        const current = viewport.scrollLeft;
        // At the destination — including the clamped one, when the deck is too short to reach the
        // commanded offset — means the glide finished; stillness there is success, not death.
        const clamped = Math.max(0, Math.min(target, viewport.scrollWidth - viewport.clientWidth));
        if (Math.abs(current - clamped) < 1) {
          return;
        }
        still = Math.abs(current - last) < 1 ? still + 1 : 0;
        last = current;
        // ~250ms of stillness without arrival: the glide is dead, not slow.
        if (still >= 15) {
          attempts += 1;
          still = 0;
          const freshTiles = getPlankTiles();
          const freshIndex = freshTiles.findIndex((tile) => tile.getAttribute('data-object-id') === scrollIntoViewId);
          if (freshIndex === -1) {
            return;
          }
          scrollPlankToPile({ viewport, stack, tiles: freshTiles, index: freshIndex, force: true });
        }
        watchdogRef.current = requestAnimationFrame(watch);
      };
      watchdogRef.current = requestAnimationFrame(watch);
    }
    void invokePromise(LayoutOperation.ScrollIntoView, { subject: undefined });
  }, [scrollIntoViewId, invokePromise, viewportRef, stackRef, getPlankTiles, scrollIntentRef]);
};

/**
 * The exposé's scale: the factor that fits the deck's natural width into the viewport, or 1 while it is
 * closed. The deck is scaled where it stands rather than re-laid out or copied into a second row, so the
 * exposé is the very same mounted planks seen from further away — nothing remounts on the way in or out,
 * and a tile is a true miniature, down to its content reflow.
 */
const useExposeScale = ({
  viewportRef,
  stackRef,
  hostRef,
  getPlankTiles,
  expose,
}: {
  viewportRef: RefObject<HTMLDivElement | null>;
  stackRef: RefObject<HTMLDivElement | null>;
  hostRef: RefObject<HTMLDivElement | null>;
  getPlankTiles: () => HTMLElement[];
  expose: boolean;
}) => {
  // Published straight onto the host rather than through React state, so it lands in the same commit that
  // opens the exposé. As state it arrived a render later, which left {@link useExposeFlip} measuring the
  // deck at full size and the scale snapping in afterwards — the zoom in simply did not animate.
  const setScale = useCallback(
    (scale: number) => hostRef.current?.style.setProperty('--deck-expose-scale', String(scale)),
    [hostRef],
  );

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const stack = stackRef.current;
    if (!viewport || !stack || !expose) {
      hostRef.current?.style.removeProperty('--deck-expose-scale');
      return;
    }
    // Summed from the tiles' own layout boxes rather than the stack's `scrollWidth`, and never from rects.
    // A rect already carries the scale being computed, and `scrollWidth` counts transformed overflow — so
    // while the FLIP holds the tiles at their old deck positions it reports a far wider stack and the
    // exposé would settle at a scale small enough to fit an arrangement that no longer exists.
    const styles = getComputedStyle(stack);
    const gap = Number.parseFloat(styles.columnGap) || 0;
    const measure = () => {
      const tiles = getPlankTiles();
      const naturalWidth =
        tiles.reduce((total, tile) => total + tile.offsetWidth, 0) + Math.max(0, tiles.length - 1) * gap;
      if (naturalWidth <= 0) {
        setScale(1);
        return;
      }
      const width = Math.max(0, viewport.clientWidth - EXPOSE_INSET_PX * 2);
      // The row is vertically centred by the transform origin, so the height only needs a cap to keep the
      // tiles off the viewport's own edges; the leading inset is applied as a translate (see the stack).
      const height = viewport.clientHeight;
      const heightLimit = height > 0 ? Math.max(0, height - EXPOSE_INSET_PX * 2) / height : 1;
      // Only ever shrinks — a deck narrower than the viewport keeps its planks at true size rather than
      // being blown up into a wall of oversized text.
      setScale(Math.min(1, width / naturalWidth, heightLimit));
    };
    measure();
    // Observes layout boxes, which a transform does not touch, so scaling never retriggers this.
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(stack);
    return () => observer.disconnect();
  }, [expose, viewportRef, stackRef, hostRef, getPlankTiles, setScale]);
};

/**
 * Animates the exposé transition by morphing each plank from where it was to where it lands (the FLIP
 * technique: measure First, apply Last, invert, play).
 *
 * The two layouts cannot be interpolated by CSS — the deck is `sticky`, folded and scrolled, the exposé is
 * flat, unfolded and scaled — so transitioning the stack's own transform animates only the zoom and leaves
 * the rearrangement to snap on the first frame, which reads as the deck jumping and *then* growing. Here
 * every layout change lands at once, invisibly, and each tile is transformed back to the position it just
 * came from; releasing that transform is what the eye follows.
 *
 * `capture` has to be called from the toggle handler rather than an effect: React has already committed the
 * new layout by the time any effect runs, so that is the last moment the previous geometry exists.
 */
const useExposeFlip = ({
  stackRef,
  getPlankTiles,
  expose,
}: {
  stackRef: RefObject<HTMLDivElement | null>;
  getPlankTiles: () => HTMLElement[];
  expose: boolean;
}): (() => void) => {
  const firstRef = useRef<Map<string, DOMRect> | undefined>(undefined);

  const capture = useCallback(() => {
    const first = new Map<string, DOMRect>();
    getPlankTiles().forEach((tile) => {
      const id = tile.getAttribute('data-object-id');
      if (id) {
        first.set(id, tile.getBoundingClientRect());
      }
    });
    firstRef.current = first;
  }, [getPlankTiles]);

  useLayoutEffect(() => {
    const first = firstRef.current;
    firstRef.current = undefined;
    const stack = stackRef.current;
    if (!first || !stack) {
      return;
    }

    // The tiles sit inside the scaled stack, so their own transforms are in that scaled space while the
    // measured deltas are in screen px — hence dividing through by the scale the stack just took.
    const stackScale = Number.parseFloat(getComputedStyle(stack).scale) || 1;
    const inverted = getPlankTiles().filter((tile) => {
      const id = tile.getAttribute('data-object-id');
      const before = id ? first.get(id) : undefined;
      if (!before) {
        return false;
      }
      const after = tile.getBoundingClientRect();
      const dx = (before.left - after.left) / stackScale;
      const dy = (before.top - after.top) / stackScale;
      const sx = after.width > 0 ? before.width / after.width : 1;
      const sy = after.height > 0 ? before.height / after.height : 1;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.001 && Math.abs(sy - 1) < 0.001) {
        return false;
      }
      tile.style.transformOrigin = 'top left';
      tile.style.transition = 'none';
      tile.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
      return true;
    });
    if (inverted.length === 0) {
      return;
    }

    const clear = (tile: HTMLElement) => {
      tile.style.transition = '';
      tile.style.transform = '';
      tile.style.transformOrigin = '';
    };
    // Next frame, so the inverted transform is painted before the transition that releases it — set in the
    // same frame the browser would collapse both into no animation at all.
    const frame = requestAnimationFrame(() => {
      inverted.forEach((tile) => {
        tile.style.transition = `transform ${EXPOSE_ZOOM_MS}ms ease-out`;
        tile.style.transform = '';
      });
    });
    // Leaving the inline transition behind would animate any later transform the tiles pick up.
    const timer = setTimeout(() => inverted.forEach(clear), EXPOSE_ZOOM_MS + EXPOSE_SETTLE_MARGIN_MS);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      inverted.forEach(clear);
    };
  }, [expose, stackRef, getPlankTiles]);

  return capture;
};

/**
 * Parks the deck's scroll at the start for the exposé and puts it back on the way out. A transform does
 * not change layout, so scaling the stack leaves the scrollable width untouched: whatever the deck was
 * scrolled past stays scrolled past, and the shrunken row would sit off the leading edge with most of the
 * planks out of view. Zeroing brings the whole row into frame; restoring returns the deck to where the
 * user left it, still folded, rather than to an unscrolled deck with every plank painted full-width.
 */
const useExposeScroll = ({
  viewportRef,
  expose,
}: {
  viewportRef: RefObject<HTMLDivElement | null>;
  expose: boolean;
}) => {
  const scrollLeftRef = useRef(0);
  const exposeRef = useRef(expose);
  exposeRef.current = expose;
  const wasExposedRef = useRef(expose);

  // Recorded off the scroll event, so the value predates the commit that opens the exposé — and is not
  // overwritten by the zeroing below, which fires a scroll event of its own.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    return addEventListener(viewport, 'scroll', () => {
      if (!exposeRef.current) {
        scrollLeftRef.current = viewport.scrollLeft;
      }
    });
  }, [viewportRef]);

  // A layout effect, so neither the jump nor the return is ever painted mid-flight.
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const wasExposed = wasExposedRef.current;
    wasExposedRef.current = expose;
    if (!viewport) {
      return;
    }

    // Set inline rather than as a class, which the viewport's own `overflow-x-scroll` would win against.
    // Everything fits in the exposé, so the bar has nothing left to scroll — and it is held through the
    // morph in either direction, because a tile transformed back to where it came from still counts
    // towards scrollable overflow and would otherwise flash a scrollbar spanning the whole deck.
    viewport.style.overflowX = 'hidden';
    if (expose) {
      viewport.scrollLeft = 0;
      return;
    }

    if (wasExposed) {
      // Settable while overflow is hidden; the bar only comes back once the tiles have stopped moving.
      viewport.scrollLeft = scrollLeftRef.current;
    }
    const timer = setTimeout(
      () => {
        viewport.style.overflowX = '';
      },
      wasExposed ? EXPOSE_ZOOM_MS + EXPOSE_SETTLE_MARGIN_MS : 0,
    );
    return () => clearTimeout(timer);
  }, [expose, viewportRef]);
};

/** Exits fullscreen on Escape, and returns the toggle so the exit button takes the same path. */
const useFullscreen = (fullscreenId: string | undefined) => {
  const { invokePromise } = useOperationInvoker();

  const toggleFullscreen = useCallback(() => {
    if (!fullscreenId) {
      return;
    }
    void invokePromise(DeckOperation.Adjust, { type: 'fullscreen' as const, id: fullscreenId });
  }, [invokePromise, fullscreenId]);

  useEffect(() => {
    if (!fullscreenId) {
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
  }, [fullscreenId, toggleFullscreen]);

  return toggleFullscreen;
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
/**
 * Whether focus rests on a plank itself rather than on anything inside it — the deck's own notion of "the
 * viewport is selected", and the gate for the arrow-key navigation.
 *
 * Attention is focus-driven, so the attendable container is exactly the element that holds focus once the
 * user has stepped out of a plank's contents (Escape from an editor lands here). Anything deeper owns its
 * own arrow keys: a caret, a list, a tree, a toolbar.
 */
const isPlankLevelFocus = (): boolean => {
  const active = document.activeElement;
  return active instanceof HTMLElement && active.matches(Attention.ATTENDABLE_SELECTOR);
};

export const DeckPlanks = () => {
  const { state, deck } = useDeckContext('DeckPlanks');
  const { overscroll } = useDeckSettings();
  const rendered = useRenderedPlanks();
  const { planks, attendedPlankId } = rendered;
  // Feeds the overscroll runway, which is sized to the last tile.
  const lastPlankId = planks[planks.length - 1];
  const breakpoint = useBreakpoints();
  const presentation = useDeckPresentation(planks.length);
  const fullscreenId = state.fullscreen;
  const fullscreen = !!fullscreenId;
  const topbar = layoutAppliesTopbar(breakpoint, fullscreen);
  const isSliding = presentation === 'sliding';
  // Gated on the sliding deck: a fullbleed singleton has nothing to expose, and no stack to scale.
  const expose = !!state.expose && isSliding;
  const viewportRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  // The plank a scroll-into-view is currently travelling to, shared between the scroller and the fold
  // hysteresis so the two do not fight over focus mid-scroll. A ref, not state: it changes per scroll
  // frame and no render depends on it.
  const scrollIntentRef = useRef<string | undefined>(undefined);

  // The plank the fold hysteresis last handed attention to, so the collapse can ignore it. A ref for the
  // same reason as above: it changes per scroll frame and no render depends on it.

  const getPlankTiles = usePlankTiles(stackRef);
  const { maxPlankWidthPx, viewportWidthPx } = useMaxPlankWidth({
    viewportRef,
    stackRef,
    isSliding,
    plankCount: planks.length,
  });
  usePreservedScroll({ viewportRef, isSliding });
  // Ahead of the fold pass, whose layout effect must measure the restored scroll position: hooks run in
  // declaration order, and measuring at the exposé's zeroed scroll reads every trailing plank as
  // off-screen — enough for the attention hysteresis to hand attention to whatever sits near the start.
  useExposeScroll({ viewportRef, expose });
  useFoldedPlanks({
    viewportRef,
    getPlankTiles,
    isSliding,
    expose,
    plankCount: planks.length,
    maxPlankWidthPx,
    scrollIntentRef,
  });
  useScrollIntoView({ viewportRef, stackRef, getPlankTiles, scrollIntoViewId: state.scrollIntoView, scrollIntentRef });
  useExposeScale({ viewportRef, stackRef, hostRef, getPlankTiles, expose });
  // Last of the layout effects, so it measures the deck only once the scroll, the folds and the scale have
  // all landed — the FLIP inversion is against the final geometry, not an intermediate one.
  const captureExposeGeometry = useExposeFlip({ stackRef, getPlankTiles, expose });
  const toggleFullscreen = useFullscreen(fullscreenId);
  const { invokePromise } = useOperationInvoker();

  // Read from refs so the key handler is bound once rather than rebound whenever the exposé toggles.
  const exposeRef = useRef(state.expose);
  exposeRef.current = state.expose;
  const captureRef = useRef(captureExposeGeometry);
  captureRef.current = captureExposeGeometry;
  const navigationRef = useRef({ planks, attendedPlankId });
  navigationRef.current = { planks, attendedPlankId };
  const getTilesRef = useRef(getPlankTiles);
  getTilesRef.current = getPlankTiles;

  // Bound here rather than as a graph action so the shortcut works wherever the deck has focus; see the
  // note in DESIGN about promoting it once its binding is settled.
  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === ';' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        captureRef.current();
        void invokePromise(DeckOperation.ToggleExpose, {});
        return;
      }

      // Escape is the way out of any overlay; the fullscreen handler already claims it for its own.
      if (event.key === 'Escape' && exposeRef.current) {
        event.preventDefault();
        captureRef.current();
        void invokePromise(DeckOperation.ToggleExpose, { expose: false });
        return;
      }

      // Arrows step between planks, but only once focus has left a plank's contents for the plank itself —
      // otherwise this would swallow every caret movement in an editor. `isPlankLevelFocus` is what makes
      // "the deck is selected" concrete: the attendable container is focused, not something inside it.
      const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
      if (step === 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return;
      }
      // The exposé shows every plank at once and its content is inert, so there is no caret to protect
      // and no scrolling to do — arrows just walk attention along the row.
      if (!exposeRef.current && !isPlankLevelFocus()) {
        return;
      }

      const { planks: current, attendedPlankId: attended } = navigationRef.current;
      // Read the focused plank from the DOM, not from `attendedPlankId`: attention arrives with a
      // render, so key repeat outruns it and every event in a burst would step from the same stale
      // plank. Falls back to the attended id when focus is not on a plank (the pre-exposé case).
      const focused = document.activeElement?.closest('[role="listitem"]')?.getAttribute('data-object-id');
      const from = (focused && current.includes(focused) ? focused : undefined) ?? attended;
      const index = from ? current.indexOf(from) : -1;
      const next = index === -1 ? current[0] : current[index + step];
      if (!next) {
        return;
      }

      event.preventDefault();
      if (exposeRef.current) {
        // Attention is focus-driven, and `preventScroll` matters here: the exposé parks the scroll at
        // zero to bring the whole row into frame, and focusing without it would scroll the row away.
        const tile = getTilesRef.current().find((candidate) => candidate.getAttribute('data-object-id') === next);
        tile?.querySelector<HTMLElement>(Attention.ATTENDABLE_SELECTOR)?.focus({ preventScroll: true });
        return;
      }

      // The same one-shot the spines and navigation use: it scrolls the plank to the front *and* attends
      // it, because the plank focuses itself off the flag.
      void invokePromise(LayoutOperation.ScrollIntoView, { subject: next });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [invokePromise]);

  // Clicking past the tiles leaves the exposé, the pointer equivalent of Escape. The tiles carry their own
  // hit target (see `DeckPlankTile`), so anything outside one is background.
  const handleBackgroundClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (expose && event.target instanceof Element && !event.target.closest('[role="listitem"]')) {
        captureExposeGeometry();
        void invokePromise(DeckOperation.ToggleExpose, { expose: false });
      }
    },
    [invokePromise, expose, captureExposeGeometry],
  );

  // The deliberate, user-initiated half of "bring a plank forward"; `useScrollIntoView` is the other
  // half, for navigation from outside the deck. Delegated to the stack because `Mosaic.Tile` forwards
  // no pointer handlers, and captured so it settles before the click reaches an editor. Deliberately
  // *not* driven by attention: attention also moves for reasons that are not a choice — a panel
  // resolving, a fold handing focus on — and acting on those moved the deck under the user.
  //
  // `ScrollIntoView` is not reused here because it also focuses the plank, which would take the caret
  // away from a click landing in a document.
  useEffect(() => {
    const stack = stackRef.current;
    if (!stack || !isSliding || expose) {
      return;
    }
    let pending: ReturnType<typeof setTimeout> | undefined;
    const off = addEventListener(
      stack,
      'pointerdown',
      (event) => {
        const tile = event.target instanceof Element ? event.target.closest('[role="listitem"]') : undefined;
        const id = tile?.getAttribute('data-object-id');
        const viewport = viewportRef.current;
        if (!id || !viewport) {
          return;
        }
        // Only a click on a plank you are *not* already reading asks for anything. Clicking inside the
        // current plank — its content, or a control in its toolbar — is
        // interaction with what you already have, and moving the deck there yanks it out from under the
        // pointer.
        if (id === navigationRef.current.attendedPlankId) {
          return;
        }

        // Deferred, and yielding: a click on a plank is often a click on a *launcher* — a mailbox row
        // opens a message — and the navigation that results owns the gesture. The deck changing
        // (`planks` identity) or a navigation intent appearing are both grounds to drop the click's own
        // scroll; the two-writer collision this prevents was measured in the app and reproduced in the
        // launcher story.
        const planksAtClick = navigationRef.current.planks;
        clearTimeout(pending);
        pending = setTimeout(() => {
          // No attended re-check here: the click itself focuses the plank, so by now attention has
          // landed on `id` and re-checking would cancel every click-to-front — the gesture this
          // handler exists for. "Already reading it" was decided at pointerdown time above.
          if (scrollIntentRef.current || navigationRef.current.planks !== planksAtClick) {
            return;
          }
          const tiles = getPlankTiles();
          const index = tiles.findIndex((candidate) => candidate.getAttribute('data-object-id') === id);
          if (index !== -1) {
            scrollPlankToPile({ viewport, stack, tiles, index });
          }
        }, CLICK_TO_FRONT_DELAY_MS);
      },
      { capture: true },
    );
    return () => {
      clearTimeout(pending);
      off();
    };
  }, [stackRef, viewportRef, getPlankTiles, isSliding, expose, scrollIntentRef]);

  const plankContext = useMemo<PlankContextValue>(
    () => ({ ...rendered, maxPlankWidthPx, captureExposeGeometry }),
    [rendered, maxPlankWidthPx, captureExposeGeometry],
  );

  // The last tile's width as actually laid out, so the runway below can wait for the split to size the
  // pair before shrinking. Undefined until the tile is found, and reset when the last plank changes.
  const [lastTileWidthPx, setLastTileWidthPx] = useState<number | undefined>(undefined);
  useLayoutEffect(() => {
    if (!overscroll || !isSliding || expose || !lastPlankId) {
      setLastTileWidthPx(undefined);
      return;
    }
    const tile = getPlankTiles().find((candidate) => candidate.getAttribute('data-object-id') === lastPlankId);
    if (!tile) {
      setLastTileWidthPx(undefined);
      return;
    }
    setLastTileWidthPx(tile.offsetWidth);
    const observer = new ResizeObserver(() => setLastTileWidthPx(tile.offsetWidth));
    observer.observe(tile);
    return () => observer.disconnect();
  }, [overscroll, isSliding, expose, lastPlankId, planks, getPlankTiles]);

  // Overscroll runway (experiment): trailing space so the last plank can scroll clear of the right edge
  // and sit at the front like any other, with only the preceding spines beside it. Sized to exactly that
  // resting position, so the deck never scrolls further than the last plank being fully forward.
  const overscrollPx = useMemo(() => {
    // Suppressed in the exposé: the runway is trailing padding, so it would count towards the natural
    // width the scale has to fit and shrink every plank to buy back space nothing occupies.
    if (!overscroll || !isSliding || expose || !lastPlankId || !viewportWidthPx) {
      return 0;
    }
    const tileSize = resolveTileSize(deck.plankSizing, lastPlankId, resolveMaxTileSize(maxPlankWidthPx));
    // The stored size can lead the measured tile by a commit, and shrinking the runway on the prediction
    // dips the deck's total width for that gap; with the deck scrolled to the end the browser clamps
    // `scrollLeft` by the dip — an instant leftward jump. Taking the smaller of prediction and
    // measurement makes the runway shrink only once the tile has genuinely widened.
    const tileSizePx = tileSize * REM_PX;
    const effectiveTileSizePx = lastTileWidthPx === undefined ? tileSizePx : Math.min(tileSizePx, lastTileWidthPx);
    return Math.max(0, viewportWidthPx - (planks.length - 1) * SPINE_PX - effectiveTileSizePx);
  }, [
    overscroll,
    isSliding,
    expose,
    planks,
    lastPlankId,
    lastTileWidthPx,
    deck.plankSizing,
    maxPlankWidthPx,
    viewportWidthPx,
  ]);

  return (
    <PlankContext.Provider value={plankContext}>
      {/* The overscroll runway and the exposé scale ride CSS vars because `Mosaic.Stack` takes classNames
          but no style. */}
      <div
        ref={hostRef}
        className='relative bg-deck-surface overflow-hidden'
        // `--deck-expose-scale` is absent here on purpose: `useExposeScale` writes it directly so it is in
        // place before the FLIP measures. The rest are constants.
        style={
          {
            ...(overscrollPx > 0 && { '--deck-overscroll': `${Math.round(overscrollPx)}px` }),
            ...(expose && {
              '--deck-expose-inset': `${EXPOSE_INSET_PX}px`,
              '--deck-expose-gutter': `${EXPOSE_GUTTER_PX}px`,
            }),
          } as CSSProperties
        }
        onClick={handleBackgroundClick}
      >
        <DeckSidebarToggles topbar={topbar} fullscreen={fullscreen} />
        {fullscreen && fullscreenId ? (
          <>
            <ExitFullscreenButton onExit={toggleFullscreen} />
            <DeckPlank
              id={fullscreenId}
              part='main'
              fullscreen
              classNames={mx('absolute inset-0', mainIntrinsicSize)}
            />
          </>
        ) : (
          // Every non-fullscreen presentation renders through this one pipeline — fullbleed included
          // (its tile spans the viewport; see DeckPlankTile's fullbleed return). One tree, keyed by
          // plank id, is what keeps a plank's DOM mounted across 1↔2 plank transitions; a separate
          // fullbleed branch here remounted the surviving plank on every message open/close (the
          // mailbox-list flash). The stack is `w-full` when not sliding so the lone tile's `w-full`
          // resolves against the viewport instead of a shrink-wrapped flex row.
          <Mosaic.Container orientation='horizontal' classNames={['absolute inset-0', mainPaddingTransitions]}>
            <ScrollArea.Root orientation='horizontal' classNames='size-full'>
              <ScrollArea.Viewport
                ref={viewportRef}
                // Scroll anchoring off: the deck owns its scroll position, and the browser's anchor
                // compensation turns any tile growing into a silent scroll no
                // code commanded — measured as the deck shifting by exactly the width delta.
                classNames={mx('[overflow-anchor:none]', breakpoint === 'mobile' && 'snap-x snap-mandatory')}
              >
                <Mosaic.Stack
                  ref={stackRef}
                  orientation='horizontal'
                  // Mobile pins the stack to the viewport width (`w-full`) so each plank's `w-full`
                  // resolves to one screen — the planks overflow the scroll viewport and snap one-to-next
                  // rather than the stack shrink-wrapping to their intrinsic width. The `--main-spacing`
                  // gap (which encapsulates each plank in its own container) only applies to the desktop
                  // sliding deck; it is a gap only, so the deck runs flush to both ends of the viewport.
                  classNames={
                    breakpoint === 'mobile'
                      ? 'h-full w-full'
                      : isSliding
                        ? mx(
                            'h-full gap-(--main-spacing)',
                            overscrollPx > 0 && 'pe-(--deck-overscroll)',
                            // Anchored left so the row starts where the deck does, and centred vertically
                            // because a uniform scale shrinks the height too. `translate` composes before
                            // `scale`, so the inset stays a true edge margin rather than being shrunk
                            // along with the row.
                            expose && 'origin-left translate-x-(--deck-expose-inset) scale-(--deck-expose-scale)',
                          )
                        : 'h-full w-full'
                  }
                  getId={getPlankId}
                  items={planks}
                  Tile={DeckPlankTile}
                  draggable={false}
                />
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Mosaic.Container>
        )}
      </div>
    </PlankContext.Provider>
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
