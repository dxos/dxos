//
// Copyright 2026 DXOS.org
//

import React, {
  type CSSProperties,
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
  Splitter,
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
import {
  useBreakpoints,
  useCompanions,
  useDeckPresentation,
  useDeckSettings,
  useDeckState,
  useSelectedCompanion,
  useSelectedCompanionVariant,
} from '#hooks';
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

// Gap/padding that encapsulates each plank in its own container (the `--main-spacing` CSS var); tweak
// here to change the deck's plank spacing.
const PLANK_SPACING_REM = 0.75;
const PLANK_SPACING = `${PLANK_SPACING_REM}rem`;

// The companion's width, held deck-wide (and variant-independently) so it survives the companion moving
// between planks and switching tabs. Not a valid node id, so it never collides with a plank. A paired
// plank keeps its *own* `plankSizing` entry and the companion is added beside it — opening or closing the
// companion therefore never resizes the plank.
const COMPANION_SIZE_KEY = 'companion';

// Companion extents (rem). Narrower than a plank: it is a side panel beside the plank it belongs to, and
// the pair has to fit the viewport alongside the rest of the deck.
const DEFAULT_COMPANION_SIZE = 30;
const MIN_COMPANION_SIZE = 15;
const MIN_PAIR_SIZE = MIN_PLANK_SIZE + MIN_COMPANION_SIZE;

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
  companionId: undefined,
  companionAnchorId: undefined,
  attendedPlankId: undefined,
  maxPlankWidthPx: Number.POSITIVE_INFINITY,
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
  /** The derived companion node id (`<anchor>/~<variant>`), or undefined when no companion is shown. */
  companionId: string | undefined;
  /** The plank the companion shares a container with. */
  companionAnchorId: string | undefined;
  /** The plank attention points into, or undefined when it points outside the deck. */
  attendedPlankId: string | undefined;
};

/**
 * What the deck renders: the real active planks, plus (when the companion is open) the derived companion
 * of the *attended* plank, which shares that plank's container rather than trailing the deck. The
 * companion is never stored in `deck.active` — it follows attention — so it is derived here.
 *
 * When the `flatten` setting is on, only the current (last) active plank renders (plus its companion), so
 * the deck stays fullbleed/tiling; the earlier active entries are surfaced as breadcrumbs in the plank
 * heading instead of as open planks.
 */
const useRenderedPlanks = (): RenderedPlanks => {
  const { deck } = useDeckContext('useRenderedPlanks');
  const { flatten } = useDeckSettings();
  const attended = useAttended();
  const planks = useMemo(() => getRenderedPlanks(deck.active, flatten), [flatten, deck.active]);
  // The attended plank is both what the companion attaches to and what the deck collapses around, so it
  // is resolved once here. Only the companion takes the last-plank fallback: collapsing the deck around a
  // plank nobody attended would scroll it out from under the user.
  const attendedPlankId = findAttendedPlank(planks, attended);
  const anchorId = attendedPlankId ?? planks[planks.length - 1];
  const companions = useCompanions(anchorId ?? '');
  const selectedVariant = useSelectedCompanionVariant();
  const { companionId } = useSelectedCompanion(companions, selectedVariant);
  const companion = anchorId && deck.companionPlanks.includes(anchorId) ? companionId : undefined;

  // Stable identity: this shape is the `PlankContext` value, so a new object per render would re-render
  // every tile on every deck render.
  return useMemo(
    () => ({
      planks,
      companionId: companion,
      companionAnchorId: companion ? anchorId : undefined,
      attendedPlankId,
    }),
    [planks, companion, anchorId, attendedPlankId],
  );
};

//
// Split panes
//

/** Trailing delay before a drag is persisted (the Splitter reports a size on every frame). */
const SPLIT_PERSIST_DELAY = 250;

/**
 * Drives a controlled {@link Splitter} from local state so a drag tracks the pointer without a
 * round-trip per frame, persisting only the trailing value; reseeds when the persisted size changes
 * externally, and flushes on unmount so the final size is not dropped inside the debounce window.
 */
const useSplitSize = (size: number | undefined, persist: (size: number) => void) => {
  const [liveSize, setLiveSize] = useState(size);
  useEffect(() => setLiveSize(size), [size]);

  // Cancel before flushing, or the already-scheduled timer fires after unmount and dispatches the same
  // size a second time.
  const pending = useRef<{ timer: ReturnType<typeof setTimeout>; flush: () => void } | undefined>(undefined);
  useEffect(
    () => () => {
      const scheduled = pending.current;
      if (scheduled) {
        clearTimeout(scheduled.timer);
        scheduled.flush();
      }
    },
    [],
  );

  // Held in a ref so a caller whose closure changes per render (it closes over the current sizes) never
  // restarts the debounce mid-drag.
  const persistRef = useRef(persist);
  persistRef.current = persist;

  const onSizeChange = useCallback((next: number) => {
    setLiveSize(next);
    if (pending.current) {
      clearTimeout(pending.current.timer);
    }
    const flush = () => {
      pending.current = undefined;
      persistRef.current(next);
    };
    pending.current = { timer: setTimeout(flush, SPLIT_PERSIST_DELAY), flush };
  }, []);

  return [liveSize, onSizeChange] as const;
};

/**
 * The viewport-derived cap on a tile, in rem: never below the tile's own minimum, never above the
 * absolute plank maximum.
 */
const resolveMaxTileSize = (maxPlankWidthPx: number, hasCompanion: boolean): number =>
  Math.max(hasCompanion ? MIN_PAIR_SIZE : MIN_PLANK_SIZE, Math.min(MAX_PLANK_SIZE, maxPlankWidthPx / REM_PX));

/**
 * Widths (rem) of a sliding tile. A tile is always its plank's own width; a companion is *added* beside
 * it, never taken out of it, so opening or closing the companion leaves the plank exactly where it was.
 * The viewport-derived cap applies to the tile as a whole and the companion absorbs it first — the plank
 * is the content the cap exists to keep reachable, so squeezing the side panel is what a narrowing
 * viewport should do.
 */
const resolveTileSizes = (
  plankSizing: Record<string, number>,
  id: string,
  hasCompanion: boolean,
  maxSize: number,
): { companionSize: number; tileSize: number } => {
  const stored = plankSizing[id] ?? DEFAULT_PLANK_SIZE;
  if (!hasCompanion) {
    return { companionSize: 0, tileSize: Math.min(stored, maxSize) };
  }

  const plankSize = Math.min(stored, Math.max(MIN_PLANK_SIZE, maxSize - MIN_COMPANION_SIZE));
  const companionSize = Math.max(
    MIN_COMPANION_SIZE,
    Math.min(plankSizing[COMPANION_SIZE_KEY] ?? DEFAULT_COMPANION_SIZE, maxSize - plankSize),
  );
  return { companionSize, tileSize: plankSize + companionSize };
};

/**
 * A plank and its companion sharing a single container — the one splitter geometry every such pair uses,
 * whether the pair fills the viewport (a lone plank) or is a tile within the sliding deck: anchored to
 * the companion and sized by the deck-wide {@link COMPANION_SIZE_KEY} width, so the seam sits in the same
 * place whichever plank the companion is attached to.
 *
 * `total` is the pair's fixed overall width, present only for a sliding tile. The seam trades width
 * between the panes inside it, so committing writes both — the plank's new width alongside the
 * companion's — in a single update, or the pair would render one frame resized against a stale total.
 */
const CompanionSplit = ({
  id,
  companionId,
  active,
  companionSize,
  total,
  classNames,
}: ThemedClassName<{
  id: string;
  companionId: string;
  active: string[];
  companionSize: number;
  total?: number;
}>) => {
  const { invokePromise } = useOperationInvoker();
  const [liveSize, onSizeChange] = useSplitSize(companionSize, (next) => {
    // Committed unrounded: the seam is controlled from `liveSize`, so a value that did not round-trip
    // exactly would snap the panes when the persisted size reseeds it.
    const sizes =
      total === undefined ? { [COMPANION_SIZE_KEY]: next } : { [COMPANION_SIZE_KEY]: next, [id]: total - next };
    void invokePromise(DeckOperation.UpdatePlankSizes, { sizes });
  });

  return (
    <Splitter.Root
      orientation='horizontal'
      anchor='end'
      resizable
      size={liveSize}
      minSize={MIN_COMPANION_SIZE}
      onSizeChange={onSizeChange}
      classNames={classNames}
    >
      <Splitter.Panel position='start'>
        <DeckPlank id={id} part='main' active={active} classNames='size-full' />
      </Splitter.Panel>
      <Splitter.Handle />
      <Splitter.Panel position='end'>
        <DeckPlank id={companionId} part='main' active={active} classNames='size-full' />
      </Splitter.Panel>
    </Splitter.Root>
  );
};

//
// DeckPlankTile
//

// Fades a tile's content out while folded (crossfading with the spine) so a wide plank never occludes the
// plank in view. The `dx-fold-content` hook lets stories retime/restyle the transition.
const FOLD_CONTENT_CLASSNAMES =
  'dx-fold-content size-full transition-opacity duration-200 ease-out group-data-[folded]/tile:pointer-events-none group-data-[folded]/tile:opacity-0';

/**
 * Tile wrapping a {@link DeckPlank}, parameterized by the derived presentation: fullbleed renders an
 * absolutely-positioned plank with no resize affordance (today's solo look); sliding renders a
 * resizable {@link Mosaic.Tile} whose committed width persists via `plankSizing`, full-viewport-width
 * and scroll-snapped below the `md` breakpoint. The tile anchoring the companion shares its container
 * with it across a {@link Splitter} seam, the same pairing the tiling deck uses. Reads the deck context
 * directly since the Mosaic stack renders tiles by id. Passes the real `deck.active` (not the rendered
 * list) to {@link DeckPlank} so ordering, the "open companion" affordance, and the solo/multi mode all
 * key off real planks.
 */
const DeckPlankTile: MosaicStackTileComponent<string> = (props) => {
  const id = props.data;
  const { deck, state } = useDeckContext('DeckPlankTile');
  const { invokePromise } = useOperationInvoker();
  const { graph } = useAppGraph();
  const node = useNode(graph, id);
  const breakpoint = useBreakpoints();
  const { planks: rendered, companionId, companionAnchorId, maxPlankWidthPx } = usePlankContext();
  const companion = id === companionAnchorId ? companionId : undefined;
  const presentation = useDeckPresentation(rendered.length);
  const isMobile = breakpoint === 'mobile';
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
  const maxSize = resolveMaxTileSize(maxPlankWidthPx, !!companion);
  const { companionSize, tileSize: storedSize } = resolveTileSizes(deck.plankSizing, id, !!companion, maxSize);
  // Expanded takes the whole cap, which is by construction the viewport less a spine for every other
  // plank — exactly the space between the two piles.
  const tileSize = state.expanded === id ? maxSize : storedSize;
  const tileWidthPx = tileSize * REM_PX;

  // The outer handle resizes the tile; with a companion attached only the plank absorbs the delta, so the
  // companion keeps the width the user gave it (and keeps it as the companion moves between planks).
  const handleSizeChange = useCallback<NonNullable<MosaicTileProps['onSizeChange']>>(
    (size) => {
      if (typeof size === 'number') {
        void invokePromise(DeckOperation.UpdatePlankSize, { id, size: size - companionSize });
        // Dragging is the user choosing a width, which is the opposite of expanded — otherwise the tile
        // would snap straight back to the cap.
        if (state.expanded === id) {
          void invokePromise(DeckOperation.Adjust, { type: 'expand' as const, id });
        }
      }
    },
    [invokePromise, id, companionSize, state.expanded],
  );

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
      classNames='group/tile relative h-full shadow-[-6px_0_16px_-8px_rgba(0,0,0,0.45)]'
      size={tileSize}
      minSize={companion ? MIN_PAIR_SIZE : MIN_PLANK_SIZE}
      maxSize={maxSize}
      onSizeChange={handleSizeChange}
      // Native two-edge sticky (the notes.andymatuschak.org pattern): a positive per-index start inset
      // builds the left pile; a *negative* end inset lets the plank slide fully off the right edge and
      // pin only once a spine's worth remains, building the right pile — both handled by the browser, so
      // the spines never flicker. z-order stacks later planks above earlier so right spines read on top.
      style={{
        position: 'sticky',
        insetInlineStart: `${index * SPINE_PX}px`,
        insetInlineEnd: `${(rendered.length - index) * SPINE_PX - tileWidthPx}px`,
        zIndex: index + 1,
      }}
    >
      {/* Fades out while folded (crossfading with the spine) so a wide plank never occludes the plank in
          view. The `dx-fold-content` hook lets stories retime/restyle the transition. */}
      {companion ? (
        <CompanionSplit
          id={id}
          companionId={companion}
          active={deck.active}
          companionSize={companionSize}
          total={tileSize}
          classNames={FOLD_CONTENT_CLASSNAMES}
        />
      ) : (
        <DeckPlank id={id} part='main' active={deck.active} classNames={FOLD_CONTENT_CLASSNAMES} />
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
 * header against the current plank (and over its companion, since later planks stack above). A plank at
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
  plankCount,
  maxPlankWidthPx,
  scrollIntentRef,
  handoffRef,
}: {
  viewportRef: RefObject<HTMLDivElement | null>;
  getPlankTiles: () => HTMLElement[];
  isSliding: boolean;
  plankCount: number;
  maxPlankWidthPx: number;
  scrollIntentRef: RefObject<string | undefined>;
  /** Set to the plank this hook hands attention to, so the collapse can tell it apart from a real choice. */
  handoffRef: RefObject<string | undefined>;
}) => {
  const { attention } = useAttentionContext(DECK_VIEWPORT_NAME);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !isSliding) {
      return;
    }
    const update = () => {
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
          // Recorded so the collapse does not treat this as the user choosing a plank and scroll it to
          // the pile — that would drag the deck back against the gesture that handed attention over.
          handoffRef.current = best?.tile.getAttribute('data-object-id') ?? undefined;
          plank.focus({ preventScroll: true });
        }
      }
    };
    update();
    const offScroll = addEventListener(viewport, 'scroll', update);
    const offResize = addEventListener(window, 'resize', update);
    return () => {
      offScroll();
      offResize();
    };
    // `maxPlankWidthPx` is a dep so the fold state recomputes when the width cap shrinks planks (else a
    // plank folded against its pre-cap width leaves a spine floating until the next scroll).
  }, [isSliding, plankCount, maxPlankWidthPx, getPlankTiles, attention, viewportRef, scrollIntentRef, handoffRef]);
};

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
}: {
  viewport: HTMLDivElement;
  stack: HTMLDivElement;
  tiles: HTMLElement[];
  index: number;
}) => {
  const styles = getComputedStyle(stack);
  const gap = parseFloat(styles.columnGap) || 0;
  // The logical property, so this and `useMaxPlankWidth` read the same inset.
  let naturalLeft = parseFloat(styles.paddingInlineStart) || 0;
  for (let plank = 0; plank < index; plank++) {
    naturalLeft += tiles[plank].offsetWidth + gap;
  }
  viewport.scrollTo({ left: Math.max(0, naturalLeft - index * SPINE_PX), behavior: 'smooth' });
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
      scrollPlankToPile({ viewport, stack, tiles, index });
    }
    void invokePromise(LayoutOperation.ScrollIntoView, { subject: undefined });
  }, [scrollIntoViewId, invokePromise, viewportRef, stackRef, getPlankTiles, scrollIntentRef]);
};

/**
 * Brings the attended plank to the front of the deck: scrolling it against the left pile pushes every
 * plank after it off the trailing edge, where the two-edge sticky pins them as the right pile — so
 * attending a plank collapses everything to its right to spines. Runs on a real change of attended plank
 * (not on every attention event) so it never fights a scroll the user is in the middle of.
 */
const useCollapseAfterAttended = ({
  viewportRef,
  stackRef,
  getPlankTiles,
  isSliding,
  attendedPlankId,
  companionId,
  scrollIntentRef,
  handoffRef,
}: {
  viewportRef: RefObject<HTMLDivElement | null>;
  stackRef: RefObject<HTMLDivElement | null>;
  getPlankTiles: () => HTMLElement[];
  isSliding: boolean;
  attendedPlankId: string | undefined;
  /** Re-runs the collapse when the pair lands; see the comment on the effect. */
  companionId: string | undefined;
  scrollIntentRef: RefObject<string | undefined>;
  handoffRef: RefObject<string | undefined>;
}) => {
  // A layout effect, so a correction lands before paint instead of as a visible slide.
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const stack = stackRef.current;
    if (!isSliding || !attendedPlankId || !viewport || !stack) {
      return;
    }

    const tiles = getPlankTiles();
    const index = tiles.findIndex((tile) => tile.getAttribute('data-object-id') === attendedPlankId);
    if (index === -1) {
      return;
    }

    // A navigation scroll is already travelling to its own target; letting this one interleave would
    // fight it mid-flight (and the fold hysteresis keys off the same intent).
    if (scrollIntentRef.current && scrollIntentRef.current !== attendedPlankId) {
      return;
    }

    // Attention the fold hysteresis handed over because the previous plank scrolled out of view. The
    // user is mid-gesture and did not pick this plank, so collapsing to it would drag the deck back
    // against the swipe.
    if (handoffRef.current === attendedPlankId) {
      handoffRef.current = undefined;
      return;
    }

    scrollPlankToPile({ viewport, stack, tiles, index });
    // `companionId` is a dependency because the companion arrives a commit *later* than the attention
    // that summoned it — `useCompanions` reads the graph in a commit-phase effect — so the first pass
    // measures the deck before the pair widened. Without re-running here the scroll stays short by the
    // companion's width, leaving the attended plank pinned and its neighbour riding over the companion.
  }, [isSliding, attendedPlankId, companionId, getPlankTiles, viewportRef, stackRef, scrollIntentRef, handoffRef]);
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
export const DeckPlanks = () => {
  const { state, deck } = useDeckContext('DeckPlanks');
  const { overscroll } = useDeckSettings();
  const rendered = useRenderedPlanks();
  const { planks, companionId, companionAnchorId, attendedPlankId } = rendered;
  const breakpoint = useBreakpoints();
  const presentation = useDeckPresentation(planks.length);
  const fullscreenId = state.fullscreen;
  const fullscreen = !!fullscreenId;
  const topbar = layoutAppliesTopbar(breakpoint, fullscreen);
  const isSliding = presentation === 'sliding';
  const viewportRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);

  // The plank a scroll-into-view is currently travelling to, shared between the scroller and the fold
  // hysteresis so the two do not fight over focus mid-scroll. A ref, not state: it changes per scroll
  // frame and no render depends on it.
  const scrollIntentRef = useRef<string | undefined>(undefined);

  // The plank the fold hysteresis last handed attention to, so the collapse can ignore it. A ref for the
  // same reason as above: it changes per scroll frame and no render depends on it.
  const handoffRef = useRef<string | undefined>(undefined);

  const getPlankTiles = usePlankTiles(stackRef);
  const { maxPlankWidthPx, viewportWidthPx } = useMaxPlankWidth({
    viewportRef,
    stackRef,
    isSliding,
    plankCount: planks.length,
  });
  usePreservedScroll({ viewportRef, isSliding });
  useFoldedPlanks({
    viewportRef,
    getPlankTiles,
    isSliding,
    plankCount: planks.length,
    maxPlankWidthPx,
    scrollIntentRef,
    handoffRef,
  });
  useScrollIntoView({ viewportRef, stackRef, getPlankTiles, scrollIntoViewId: state.scrollIntoView, scrollIntentRef });
  useCollapseAfterAttended({
    viewportRef,
    stackRef,
    getPlankTiles,
    isSliding,
    attendedPlankId,
    companionId,
    scrollIntentRef,
    handoffRef,
  });
  const toggleFullscreen = useFullscreen(fullscreenId);

  const plankContext = useMemo<PlankContextValue>(
    () => ({ ...rendered, maxPlankWidthPx }),
    [rendered, maxPlankWidthPx],
  );

  // Overscroll runway (experiment): trailing space so the last plank can scroll clear of the right edge
  // and sit at the front like any other, with only the preceding spines beside it. Sized to exactly that
  // resting position, so the deck never scrolls further than the last plank being fully forward.
  const overscrollPx = useMemo(() => {
    const lastId = planks[planks.length - 1];
    if (!overscroll || !isSliding || !lastId || !viewportWidthPx) {
      return 0;
    }
    const paired = companionAnchorId === lastId && !!companionId;
    const { tileSize } = resolveTileSizes(
      deck.plankSizing,
      lastId,
      paired,
      resolveMaxTileSize(maxPlankWidthPx, paired),
    );
    return Math.max(0, viewportWidthPx - (planks.length - 1) * SPINE_PX - tileSize * REM_PX);
  }, [
    overscroll,
    isSliding,
    planks,
    companionAnchorId,
    companionId,
    deck.plankSizing,
    maxPlankWidthPx,
    viewportWidthPx,
  ]);

  // A fullbleed pair flexes to the viewport rather than taking a stored total, so only the lower bound
  // applies here — the Splitter's own clamp keeps the plank pane on screen.
  const soloCompanionSize = Math.max(
    MIN_COMPANION_SIZE,
    deck.plankSizing[COMPANION_SIZE_KEY] ?? DEFAULT_COMPANION_SIZE,
  );

  return (
    <PlankContext.Provider value={plankContext}>
      {/* The overscroll runway rides a CSS var because `Mosaic.Stack` takes classNames but no style. */}
      <div
        className='relative bg-deck-surface overflow-hidden'
        style={
          overscrollPx > 0 ? ({ '--deck-overscroll': `${Math.round(overscrollPx)}px` } as CSSProperties) : undefined
        }
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
        ) : presentation === 'fullbleed' && companionAnchorId && companionId ? (
          // A lone plank with its companion: the pair fills the viewport across the same seam it has as a
          // sliding tile, so opening a second plank never moves it.
          <CompanionSplit
            id={companionAnchorId}
            companionId={companionId}
            active={deck.active}
            companionSize={soloCompanionSize}
            classNames={mx('absolute inset-0', mainPaddingTransitions)}
          />
        ) : presentation === 'fullbleed' && planks[0] ? (
          // A singleton deck renders the plank directly as an absolute-inset child of this filled
          // container (today's solo look). Routing it through the horizontal Mosaic.Stack/ScrollArea
          // collapses it — an `absolute inset-0` plank contributes no intrinsic size to a flex tile.
          <DeckPlank
            id={planks[0]}
            part='main'
            // Pass the real deck.active (not the collapsed `planks`) so flat mode can derive the
            // breadcrumb trail from the planks preceding the current one.
            active={deck.active}
            classNames={mx('absolute inset-0', mainIntrinsicSize)}
          />
        ) : (
          <Mosaic.Container orientation='horizontal' classNames={['absolute inset-0', mainPaddingTransitions]}>
            <ScrollArea.Root orientation='horizontal' classNames='size-full'>
              <ScrollArea.Viewport ref={viewportRef} classNames={breakpoint === 'mobile' && 'snap-x snap-mandatory'}>
                <Mosaic.Stack
                  ref={stackRef}
                  orientation='horizontal'
                  // Mobile pins the stack to the viewport width (`w-full`) so each plank's `w-full`
                  // resolves to one screen — the planks overflow the scroll viewport and snap one-to-next
                  // rather than the stack shrink-wrapping to their intrinsic width. The `--main-spacing`
                  // gap (which encapsulates each plank in its own container) only applies to the desktop
                  // sliding deck; it is a gap only, so the deck runs flush to both ends of the viewport.
                  classNames={
                    breakpoint === 'mobile' ? 'h-full w-full' : isSliding ? 'h-full gap-(--main-spacing)' : 'h-full'
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
