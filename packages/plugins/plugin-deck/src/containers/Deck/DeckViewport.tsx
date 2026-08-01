//
// Copyright 2026 DXOS.org
//

import React, {
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

import { layoutAppliesTopbar, resolveCompanionAnchor } from '../../util';
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

// The companion persists a single shared width (keyed variant-independently) so switching companion tabs
// does not resize the pane. Not a valid node id, so it never collides with a plank.
const COMPANION_SIZE_KEY = 'companion';

// Companion extents (rem). Narrower than a plank: it is a side panel beside the plank it belongs to, and
// the pair has to fit the viewport alongside the rest of the deck.
const DEFAULT_COMPANION_SIZE = 30;
const MIN_COMPANION_SIZE = 15;

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
  paneCount: 0,
  maxPlankWidthPx: Number.POSITIVE_INFINITY,
});

const usePlankContext = () => useContext(PlankContext);

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
  /** Panes competing for the viewport's width — the planks plus the companion — driving the presentation. */
  paneCount: number;
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
  const lastPlank = deck.active[deck.active.length - 1];
  const planks = useMemo(
    () => (flatten ? (lastPlank ? [lastPlank] : []) : [...deck.active]),
    [flatten, lastPlank, deck.active],
  );
  const anchorId = resolveCompanionAnchor(planks, attended);
  const companions = useCompanions(anchorId ?? '');
  const selectedVariant = useSelectedCompanionVariant();
  const { companionId } = useSelectedCompanion(companions, selectedVariant);
  const companion = deck.companionOpen && anchorId ? companionId : undefined;

  // Stable identity: this shape is the `PlankContext` value, so a new object per render would re-render
  // every tile on every deck render.
  return useMemo(
    () => ({
      planks,
      companionId: companion,
      companionAnchorId: companion ? anchorId : undefined,
      paneCount: planks.length + (companion ? 1 : 0),
    }),
    [planks, companion, anchorId],
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

  const pending = useRef<{ timer: ReturnType<typeof setTimeout>; flush: () => void } | undefined>(undefined);
  useEffect(() => () => pending.current?.flush(), []);

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
 * Widths (rem) of a sliding tile's panes: a plain tile is just its plank, while the tile hosting the
 * companion is the pair sharing one container. The viewport-derived cap applies to the tile as a whole,
 * and the companion absorbs it — the plank is the content the cap exists to keep reachable, so squeezing
 * the side panel first is what a narrowing viewport should do.
 */
const resolveTileSizes = (
  plankSizing: Record<string, number>,
  id: string,
  hasCompanion: boolean,
  maxSize: number,
): { plankSize: number; companionSize: number; tileSize: number } => {
  const stored = plankSizing[id] ?? DEFAULT_PLANK_SIZE;
  if (!hasCompanion) {
    const plankSize = Math.min(stored, maxSize);
    return { plankSize, companionSize: 0, tileSize: plankSize };
  }

  const plankSize = Math.min(stored, Math.max(MIN_PLANK_SIZE, maxSize - MIN_COMPANION_SIZE));
  const companionSize = Math.max(
    MIN_COMPANION_SIZE,
    Math.min(plankSizing[COMPANION_SIZE_KEY] ?? DEFAULT_COMPANION_SIZE, maxSize - plankSize),
  );
  return { plankSize, companionSize, tileSize: plankSize + companionSize };
};

/**
 * The attended plank and its companion sharing a single container, split by the same {@link Splitter}
 * seam the tiling deck uses. The seam is anchored to the companion so it keeps the width the user gave
 * it as the plank grows; committing writes both panes, holding the tile's overall width — which the
 * deck's sticky stacking geometry is measured against — steady while the seam moves.
 */
const CompanionSplit = ({
  id,
  companionId,
  active,
  plankSize,
  companionSize,
  classNames,
}: ThemedClassName<{
  id: string;
  companionId: string;
  active: string[];
  plankSize: number;
  companionSize: number;
}>) => {
  const { invokePromise } = useOperationInvoker();
  const tileSize = plankSize + companionSize;
  const [liveSize, onSizeChange] = useSplitSize(companionSize, (next) => {
    void invokePromise(DeckOperation.UpdatePlankSize, { id: COMPANION_SIZE_KEY, size: Math.round(next) });
    void invokePromise(DeckOperation.UpdatePlankSize, { id, size: Math.round(tileSize - next) });
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
  const { deck } = useDeckContext('DeckPlankTile');
  const { invokePromise } = useOperationInvoker();
  const { graph } = useAppGraph();
  const node = useNode(graph, id);
  const breakpoint = useBreakpoints();
  const { planks: rendered, companionId, companionAnchorId, paneCount, maxPlankWidthPx } = usePlankContext();
  const companion = id === companionAnchorId ? companionId : undefined;
  const presentation = useDeckPresentation(paneCount);
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
  const maxSize = Math.max(MIN_PLANK_SIZE, Math.min(MAX_PLANK_SIZE, maxPlankWidthPx / REM_PX));
  const { plankSize, companionSize, tileSize } = resolveTileSizes(deck.plankSizing, id, !!companion, maxSize);
  const tileWidthPx = tileSize * REM_PX;

  // The outer handle resizes the tile; with a companion attached only the plank pane absorbs the delta,
  // so the companion keeps the width the user gave it.
  const handleSizeChange = useCallback<NonNullable<MosaicTileProps['onSizeChange']>>(
    (size) => {
      if (typeof size === 'number') {
        void invokePromise(DeckOperation.UpdatePlankSize, { id, size: Math.round(size - companionSize) });
      }
    },
    [invokePromise, id, companionSize],
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
      minSize={MIN_PLANK_SIZE + companionSize}
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
          plankSize={plankSize}
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
// TilingDeck
//

/**
 * Tiling presentation: two panes split the viewport flush (no horizontal overflow) across a draggable
 * seam — either two planks, or a plank and its companion. The start pane's width persists per deck via
 * {@link DeckOperation.UpdateTilingSize} and the end pane fills the remainder, so the split holds through
 * a viewport resize and through swapping which plank sits where.
 */
// TODO(wittjosiah): Two panes only (TILING_MAX), since Splitter is a two-panel primitive; raising
//   TILING_MAX needs nested Splitters or a weights-based container.
const TilingDeck = ({ panes, active, size }: { panes: string[]; active: string[]; size: number | undefined }) => {
  const { invokePromise } = useOperationInvoker();
  const [liveSize, handleSizeChange] = useSplitSize(size, (next) => {
    void invokePromise(DeckOperation.UpdateTilingSize, { size: next });
  });

  const [startId, endId] = panes;

  // Tiling is a flush split view — no `--main-spacing` gap or padding (that spacing is the sliding
  // deck's encapsulated look); the planks sit edge-to-edge, separated only by the handle's hairline.
  return (
    <Splitter.Root
      orientation='horizontal'
      anchor='start'
      resizable
      size={liveSize}
      minSize={MIN_PLANK_SIZE}
      onSizeChange={handleSizeChange}
      classNames={mx('absolute inset-0', mainPaddingTransitions)}
    >
      <Splitter.Panel position='start'>
        <DeckPlank id={startId} part='main' active={active} classNames='size-full' />
      </Splitter.Panel>
      <Splitter.Handle />
      <Splitter.Panel position='end'>
        <DeckPlank id={endId} part='main' active={active} classNames='size-full' />
      </Splitter.Panel>
    </Splitter.Root>
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
 * Caps a sliding plank's width to the viewport, reserving a spine plus gap for every other plank (and
 * the stack's own padding), so the current plank's trailing controls stay clear of the piled spines. A
 * layout effect, so the cap lands before first paint — no flash of full-width planks on load.
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
}): number => {
  const [maxPlankWidthPx, setMaxPlankWidthPx] = useState(Number.POSITIVE_INFINITY);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !isSliding) {
      setMaxPlankWidthPx(Number.POSITIVE_INFINITY);
      return;
    }
    const measure = () => {
      const stack = stackRef.current;
      const styles = stack && getComputedStyle(stack);
      const gap = styles ? parseFloat(styles.columnGap) || 0 : 0;
      const padding = styles
        ? (parseFloat(styles.paddingInlineStart) || 0) + (parseFloat(styles.paddingInlineEnd) || 0)
        : 0;
      const others = Math.max(0, plankCount - 1);
      const max = viewport.clientWidth - padding - others * (SPINE_PX + gap);
      setMaxPlankWidthPx(max > 0 ? max : Number.POSITIVE_INFINITY);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [isSliding, plankCount, viewportRef, stackRef]);

  return maxPlankWidthPx;
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
}: {
  viewportRef: RefObject<HTMLDivElement | null>;
  getPlankTiles: () => HTMLElement[];
  isSliding: boolean;
  plankCount: number;
  maxPlankWidthPx: number;
  scrollIntentRef: RefObject<string | undefined>;
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
  }, [isSliding, plankCount, maxPlankWidthPx, getPlankTiles, attention, viewportRef, scrollIntentRef]);
};

/**
 * Scrolls a plank into view and clears the one-shot flag — both for navigation and for a folded spine
 * returning its plank to view, so there is one implementation of "where does this plank sit".
 *
 * The offset can't come from the tile's rect or `offsetLeft`: while sliding the tiles are
 * `position: sticky`, so both report the pinned position (clustered for planks in a pile). Summing the
 * preceding plank widths and gaps gives the natural offset instead, and backing off one spine per
 * preceding plank leaves the target just past the left pile.
 */
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
      const styles = getComputedStyle(stack);
      const gap = parseFloat(styles.columnGap) || 0;
      let naturalLeft = parseFloat(styles.paddingLeft) || 0;
      for (let plank = 0; plank < index; plank++) {
        naturalLeft += tiles[plank].offsetWidth + gap;
      }
      viewport.scrollTo({ left: Math.max(0, naturalLeft - index * SPINE_PX), behavior: 'smooth' });
    }
    void invokePromise(LayoutOperation.ScrollIntoView, { subject: undefined });
  }, [scrollIntoViewId, invokePromise, viewportRef, stackRef, getPlankTiles, scrollIntentRef]);
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
  const rendered = useRenderedPlanks();
  const { planks, companionId, companionAnchorId, paneCount } = rendered;
  const breakpoint = useBreakpoints();
  const presentation = useDeckPresentation(paneCount);
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

  const getPlankTiles = usePlankTiles(stackRef);
  const maxPlankWidthPx = useMaxPlankWidth({ viewportRef, stackRef, isSliding, plankCount: planks.length });
  usePreservedScroll({ viewportRef, isSliding });
  useFoldedPlanks({
    viewportRef,
    getPlankTiles,
    isSliding,
    plankCount: planks.length,
    maxPlankWidthPx,
    scrollIntentRef,
  });
  useScrollIntoView({ viewportRef, stackRef, getPlankTiles, scrollIntoViewId: state.scrollIntoView, scrollIntentRef });
  const toggleFullscreen = useFullscreen(fullscreenId);

  const plankContext = useMemo<PlankContextValue>(
    () => ({ ...rendered, maxPlankWidthPx }),
    [rendered, maxPlankWidthPx],
  );

  // Tiling splits the viewport between exactly two panes: either the two planks, or — when the companion
  // is what makes the deck two panes wide — the anchor plank and its companion.
  const tilingPanes = useMemo(
    () => (companionAnchorId && companionId ? [companionAnchorId, companionId] : planks),
    [companionAnchorId, companionId, planks],
  );

  return (
    <PlankContext.Provider value={plankContext}>
      <div className='relative bg-deck-surface overflow-hidden'>
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
        ) : presentation === 'tiling' ? (
          <TilingDeck panes={tilingPanes} active={deck.active} size={deck.tilingSizing} />
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
                  // gap/padding (which encapsulates each plank in its own container) only applies to the
                  // desktop sliding deck, matching today's multi-mode look.
                  classNames={
                    breakpoint === 'mobile'
                      ? 'h-full w-full'
                      : isSliding
                        ? 'h-full gap-(--main-spacing) px-(--main-spacing)'
                        : 'h-full'
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
