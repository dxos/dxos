//
// Copyright 2026 DXOS.org
//

import React, {
  Fragment,
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
import { useNode } from '@dxos/plugin-graph';
import {
  Icon,
  IconButton,
  Main,
  type MainContentProps,
  ScrollArea,
  toLocalizedString,
  useOnTransition,
  useTranslation,
} from '@dxos/react-ui';
import { mainIntrinsicSize, mainPaddingTransitions } from '@dxos/react-ui';
import { isLinkedSegment, useAttentionContext } from '@dxos/react-ui-attention';
import { Mosaic, type MosaicStackTileComponent, type MosaicTileProps } from '@dxos/react-ui-mosaic';
import { hoverableControls, hoverableFocusedWithinControls, mx } from '@dxos/ui-theme';

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

const REM_PX = 16;

// Gap/padding that encapsulates each plank in its own container (the `--main-spacing` CSS var); tweak
// here to change the deck's plank spacing.
const PLANK_SPACING_REM = 0.75;
const PLANK_SPACING = `${PLANK_SPACING_REM}rem`;

// The companion plank persists a single shared width (keyed variant-independently) so switching
// companion tabs does not resize the pane. Not a valid node id, so it never collides with a plank.
const COMPANION_SIZE_KEY = 'companion';

// EXPERIMENT (stacked notes): while sliding, planks are sticky and pile on the left as you scroll.
// Each pinned plank reveals a `SPINE_PX`-wide sliver; once a plank's visible width drops below
// `FOLD_THRESHOLD_PX` (no room for its header) it folds to a vertical spine sigil.
const SPINE_PX = 44;
// A plank folds to its spine once the sliver still showing narrows below a spine plus the inter-plank
// gap — i.e. just as it would otherwise tuck fully behind its neighbor.
const FOLD_THRESHOLD_PX = SPINE_PX + PLANK_SPACING_REM * REM_PX;

// Scrolls a plank back into view when its folded spine is clicked (see fold behavior below).
const ScrollToPlankContext = createContext<(id: string, index: number) => void>(() => {});

// Upper bound (px) on a sliding plank's width, measured from the viewport so the current plank's
// trailing controls never disappear behind the piled spines of the other planks. Infinity until measured.
const MaxPlankWidthContext = createContext<number>(Number.POSITIVE_INFINITY);

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

/**
 * The planks the deck renders: normally the real active planks plus, when the companion is open, the
 * derived trailing companion plank of the last plank (`<lastPlank>/~<variant>`). The companion is never
 * stored in `deck.active` — it always follows the current last plank — so it is derived here and
 * rendered as an ordinary plank. `companionId` is the trailing entry, or undefined when no companion is
 * shown.
 *
 * When the `flatten` setting is on, only the current (last) active plank renders (plus its companion),
 * so the deck stays fullbleed/tiling; the earlier active entries are surfaced as `breadcrumbs` in the
 * plank heading instead of as open planks.
 */
const useRenderedPlanks = (): { rendered: string[]; companionId: string | undefined; breadcrumbs: string[] } => {
  const { deck } = useDeckContext('useRenderedPlanks');
  const { flatten } = useDeckSettings();
  const lastPlank = deck.active[deck.active.length - 1];
  const companions = useCompanions(lastPlank ?? '');
  const selectedVariant = useSelectedCompanionVariant();
  const { companionId } = useSelectedCompanion(companions, selectedVariant);
  const companion = deck.companionOpen && lastPlank ? companionId : undefined;
  const base = flatten ? (lastPlank ? [lastPlank] : []) : [...deck.active];
  const breadcrumbs = flatten ? deck.active.slice(0, -1) : [];
  return { rendered: companion ? [...base, companion] : base, companionId: companion, breadcrumbs };
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
  const { graph } = useAppGraph();
  const node = useNode(graph, id);
  const breakpoint = useBreakpoints();
  const { rendered } = useRenderedPlanks();
  const presentation = useDeckPresentation(rendered.length);
  const isMobile = breakpoint === 'mobile';
  const soloLook = rendered.length === 1;
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
  const scrollToPlank = useContext(ScrollToPlankContext);
  // The companion plank keeps one shared width across its variants (a companion id is
  // `<plank>/~<variant>`), so switching tabs never resizes it; ordinary planks size per id.
  const sizingKey = isLinkedSegment(id) ? COMPANION_SIZE_KEY : id;
  // Clamp the plank to a viewport-derived cap so its trailing controls stay clear of the piled spines;
  // the cap only ever shrinks the stored width, so widths are restored when the viewport grows.
  const maxPlankWidthPx = useContext(MaxPlankWidthContext);
  const maxSize = Math.max(MIN_PLANK_SIZE, Math.min(MAX_PLANK_SIZE, maxPlankWidthPx / REM_PX));
  const plankSize = Math.min(deck.plankSizing[sizingKey] ?? DEFAULT_PLANK_SIZE, maxSize);
  const plankWidthPx = plankSize * REM_PX;

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
      // Faint leading-edge shadow so a plank reads as sitting on top of the one behind it as they slide
      // over each other (planks stack by z-index; each one's left edge overlaps its left neighbor).
      classNames='group/tile relative h-full shadow-[-6px_0_16px_-8px_rgba(0,0,0,0.45)]'
      size={plankSize}
      minSize={MIN_PLANK_SIZE}
      maxSize={maxSize}
      onSizeChange={handleSizeChange}
      // Native two-edge sticky (the notes.andymatuschak.org pattern): a positive per-index start inset
      // builds the left pile; a *negative* end inset lets the plank slide fully off the right edge and
      // pin only once a spine's worth remains, building the right pile — both handled by the browser, so
      // the spines never flicker. z-order stacks later planks above earlier so right spines read on top.
      style={{
        position: 'sticky',
        insetInlineStart: `${index * SPINE_PX}px`,
        insetInlineEnd: `${(rendered.length - index) * SPINE_PX - plankWidthPx}px`,
        zIndex: index + 1,
      }}
    >
      {/* Fades out while folded (crossfading with the spine) so a wide plank never occludes the plank in
          view. The `dx-fold-content` hook lets stories retime/restyle the transition. */}
      <DeckPlank
        id={id}
        part='main'
        active={deck.active}
        soloLook={soloLook}
        classNames='dx-fold-content size-full transition-opacity duration-200 ease-out group-data-[folded]/tile:pointer-events-none group-data-[folded]/tile:opacity-0'
      />
      {/* Fold spine: a book-spine sigil (icon + vertical title) that crossfades in as the plank collapses
          (DeckPlanks toggles `data-folded`). It sits at the plank's leading edge — the sliver that stays
          visible in either pile — with its icon aligned to the plank toolbar's sigil, and returns the
          plank to view on click. The `dx-fold-spine` hook lets stories retime/restyle the transition. */}
      <button
        onClick={() => scrollToPlank(id, index)}
        aria-label={spineLabel}
        className='dx-fold-spine absolute inset-y-0 left-0 z-[1] flex w-11 flex-col items-center border-ie border-separator bg-base-surface opacity-0 pointer-events-none transition-opacity duration-200 ease-out group-data-[folded]/tile:pointer-events-auto group-data-[folded]/tile:opacity-100'
      >
        {/* Icon box matches the plank toolbar height so the sigil stays put as the plank folds. */}
        <div className='flex h-(--dx-rail-content) shrink-0 items-center justify-center'>
          <Icon icon={spineIcon} size={5} classNames='shrink-0 text-subdued' />
        </div>
        <span className='truncate text-sm text-description [writing-mode:vertical-rl] rotate-180'>{spineLabel}</span>
      </button>
      <Mosaic.ResizeHandle />
    </Mosaic.Tile>
  );
};

//
// TilingDeck
//

// Minimum fraction of the deck width a tiled plank may be shrunk to via the splitter.
const MIN_TILING_FRACTION = 0.15;

/** Normalize persisted weights to `count` positive fractions summing to 1; fall back to equal. */
const normalizeTilingWeights = (weights: readonly number[] | undefined, count: number): number[] => {
  const valid = !!weights && weights.length === count && weights.every((weight) => weight > 0);
  const base = valid ? weights.slice() : Array.from({ length: count }, () => 1);
  const sum = base.reduce((total, weight) => total + weight, 0);
  return sum > 0 ? base.map((weight) => weight / sum) : Array.from({ length: count }, () => 1 / count);
};

/**
 * Tiling presentation: planks split the viewport width proportionally (no horizontal overflow), with a
 * draggable splitter between adjacent planks that adjusts the split ratio. The ratio persists per
 * position via {@link DeckOperation.UpdateTilingSize} (so swapping which plank sits in a slot keeps the
 * split) and is reflected live during a drag through local state.
 */
const TilingDeck = ({
  rendered,
  active,
  weights,
}: {
  rendered: string[];
  active: string[];
  weights: readonly number[] | undefined;
}) => {
  const { invokePromise } = useOperationInvoker();
  const containerRef = useRef<HTMLDivElement>(null);
  const [liveWeights, setLiveWeights] = useState<number[] | null>(null);
  const persisted = useMemo(() => normalizeTilingWeights(weights, rendered.length), [weights, rendered.length]);
  const applied = liveWeights ?? persisted;

  // Drop the live override once the persisted ratio catches up with the committed drag, so external
  // changes take effect again without a mid-round-trip flicker.
  useEffect(() => {
    if (
      liveWeights &&
      liveWeights.length === persisted.length &&
      liveWeights.every((weight, index) => Math.abs(weight - persisted[index]) < 0.001)
    ) {
      setLiveWeights(null);
    }
  }, [liveWeights, persisted]);

  const handleCommit = useCallback(
    (next: number[]) => {
      setLiveWeights(next);
      void invokePromise(DeckOperation.UpdateTilingSize, { weights: next });
    },
    [invokePromise],
  );

  // Tiling is a flush split view — no `--main-spacing` gap or padding (that spacing is the sliding
  // deck's encapsulated look); the planks sit edge-to-edge, separated only by the hairline splitter.
  return (
    <div ref={containerRef} className={mx('absolute inset-0 flex', mainPaddingTransitions)}>
      {rendered.map((id, index) => (
        <Fragment key={id}>
          <div className='relative h-full min-w-0' style={{ flexGrow: applied[index], flexBasis: '0%' }}>
            <DeckPlank id={id} part='main' active={active} soloLook={false} classNames='size-full' />
          </div>
          {index < rendered.length - 1 && (
            <TilingSplitter
              index={index}
              weights={applied}
              containerRef={containerRef}
              onPreview={setLiveWeights}
              onCommit={handleCommit}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
};

/**
 * Draggable divider between two tiled planks. Transfers width between the panes on either side (`index`
 * and `index + 1`) as a fraction of the deck width, clamped so neither shrinks below
 * {@link MIN_TILING_FRACTION}. Reports live fractions via `onPreview` during the drag and the final
 * ones via `onCommit` on drop.
 */
const TilingSplitter = ({
  index,
  weights,
  containerRef,
  onPreview,
  onCommit,
}: {
  index: number;
  weights: number[];
  containerRef: RefObject<HTMLDivElement | null>;
  onPreview: (weights: number[]) => void;
  onCommit: (weights: number[]) => void;
}) => {
  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWeights = weights.slice();
      const controller = new AbortController();

      const compute = (clientX: number): number[] => {
        const width = containerRef.current?.getBoundingClientRect().width ?? 0;
        if (width <= 0) {
          return startWeights;
        }
        const raw = (clientX - startX) / width;
        const delta = Math.min(
          startWeights[index + 1] - MIN_TILING_FRACTION,
          Math.max(MIN_TILING_FRACTION - startWeights[index], raw),
        );
        const next = startWeights.slice();
        next[index] += delta;
        next[index + 1] -= delta;
        return next;
      };

      window.addEventListener('pointermove', (moveEvent) => onPreview(compute(moveEvent.clientX)), {
        signal: controller.signal,
      });
      window.addEventListener(
        'pointerup',
        (upEvent) => {
          onCommit(compute(upEvent.clientX));
          controller.abort();
        },
        { signal: controller.signal },
      );
    },
    [index, weights, containerRef, onPreview, onCommit],
  );

  return (
    // Zero-width so the tiled planks stay flush; the hairline divider and the (wider) drag hit-area
    // overlay the seam via absolute positioning.
    <div className='relative flex-none'>
      {/* Persistent hairline divider between the tiled planks, matching the solo+companion split. */}
      <div className='absolute inset-y-0 start-0 w-px -translate-x-1/2 bg-subdued-separator' />
      <button
        aria-label='Resize'
        onPointerDown={handlePointerDown}
        className={mx(
          'group absolute inset-y-0 -inset-x-1 z-[1] cursor-col-resize touch-none focus-visible:outline-hidden',
          'before:absolute before:inset-y-0 before:start-1/2 before:block before:w-1 before:-translate-x-1/2 before:rounded-full before:bg-focus-ring-subtle',
          'before:opacity-0 before:transition-opacity before:duration-100 hover:before:opacity-100 active:before:opacity-100',
        )}
      />
    </div>
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
  const { state, deck } = useDeckContext('DeckPlanks');
  const { rendered } = useRenderedPlanks();
  const { invokePromise } = useOperationInvoker();
  const breakpoint = useBreakpoints();
  const presentation = useDeckPresentation(rendered.length);
  const fullscreenId = state.fullscreen;
  const fullscreen = !!fullscreenId;
  const topbar = layoutAppliesTopbar(breakpoint, fullscreen);
  const viewportRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const isSliding = presentation === 'sliding';
  // Viewport-derived cap on a sliding plank's width (see the measuring layout effect below); consumed by
  // tiles via `MaxPlankWidthContext` and by the fold effect so folds track the capped width.
  const [maxPlankWidthPx, setMaxPlankWidthPx] = useState(Number.POSITIVE_INFINITY);

  // The deck's own plank tiles are the *direct* children of the Mosaic stack. Scoping to them keeps
  // nested `role="listitem"` content (CRM lists, markdown bullets, embedded mosaics) out of the fold and
  // scroll geometry — otherwise a plank whose content contains list items measures wrong, folds
  // spuriously, and sticks as a spine.
  const getPlankTiles = useCallback(
    () => Array.from(stackRef.current?.querySelectorAll<HTMLElement>(':scope > [role="listitem"]') ?? []),
    [],
  );

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

  // Scroll a folded plank back into view (reveal it just past the left pile of `index` spines). A plank's
  // natural offset can't come from `offsetLeft`: the tiles are position:sticky and their offsetParent
  // doesn't scroll, so offsetLeft reports the pinned position (clustered for planks in a pile). Sum the
  // actual plank widths + gaps instead, so the scroll distance tracks plank size for any index.
  const scrollToPlank = useCallback(
    (_id: string, index: number) => {
      const viewport = viewportRef.current;
      const stack = stackRef.current;
      const tiles = getPlankTiles();
      if (!viewport || !stack || tiles.length === 0) {
        return;
      }
      const styles = getComputedStyle(stack);
      const gap = parseFloat(styles.columnGap) || 0;
      let naturalLeft = parseFloat(styles.paddingLeft) || 0;
      for (let plank = 0; plank < index; plank++) {
        naturalLeft += tiles[plank].offsetWidth + gap;
      }
      viewport.scrollTo({ left: Math.max(0, naturalLeft - index * SPINE_PX), behavior: 'smooth' });
    },
    [getPlankTiles],
  );

  // Fold detection (experiment): pinning is entirely native CSS `sticky` (see the tile style), so this
  // effect never repositions anything — it only reads the already-pinned rects to decide when a plank has
  // collapsed to a sliver, then shows its spine on the edge it pinned to. Reading stable positions means
  // the spines never lag or flicker during a scroll.
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
        // In both piles a plank is covered on its right by the next plank (which stacks above it), so its
        // spine is the sliver from its own left edge to the next plank's left edge. Fold once that sliver
        // is narrow enough that the header no longer fits. The last plank has no cover, so use its own
        // visible width. Reads the CSS-pinned rects only — no repositioning — so nothing lags the scroll.
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

      // Attention hysteresis: attention must always point at a plank the user can see. It moves only
      // when the attended plank has folded to a spine (or left the viewport entirely — the mobile snap
      // case, where tiles are not sticky), and then to the unfolded plank nearest the viewport center,
      // so focus never twitches while the attended plank remains visible.
      const [attendedId] = attention?.getCurrent() ?? [];
      const offscreen = (rect: DOMRect) => rect.right <= vpRect.left || rect.left >= vpRect.right;
      const attendedIndex = attendedId
        ? tiles.findIndex((tile) => {
            const id = tile.getAttribute('data-object-id');
            return !!id && (attendedId === id || attendedId.startsWith(`${id}/`));
          })
        : -1;
      if (attendedIndex !== -1 && (folded[attendedIndex] || offscreen(rects[attendedIndex]))) {
        const vpCenter = vpRect.left + vpRect.width / 2;
        let best: { id: string; distance: number } | undefined;
        tiles.forEach((tile, index) => {
          const id = tile.getAttribute('data-object-id');
          if (!id || folded[index] || offscreen(rects[index])) {
            return;
          }
          const distance = Math.abs((rects[index].left + rects[index].right) / 2 - vpCenter);
          if (!best || distance < best.distance) {
            best = { id, distance };
          }
        });
        if (best) {
          attention.update([best.id]);
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
  }, [isSliding, rendered.length, maxPlankWidthPx, getPlankTiles, attention]);

  // Cap the plank width to the viewport so the current plank's trailing controls never hide behind the
  // piled spines: reserve a spine (plus the stack gap) for every other plank, then subtract the stack
  // padding. Recomputed as the viewport resizes (window, sidebar) so the bound tracks the screen size.
  // A layout effect so the cap lands before first paint — no flash of full-width planks on load.
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
      const others = Math.max(0, rendered.length - 1);
      const max = viewport.clientWidth - padding - others * (SPINE_PX + gap);
      setMaxPlankWidthPx(max > 0 ? max : Number.POSITIVE_INFINITY);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [isSliding, rendered.length]);

  // Scroll the just-navigated plank into view, then clear the one-shot flag.
  useEffect(() => {
    const id = state.scrollIntoView;
    const viewport = viewportRef.current;
    if (!id || !viewport) {
      return;
    }

    const tile = stackRef.current?.querySelector<HTMLElement>(`:scope > [data-object-id="${CSS.escape(id)}"]`);
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
    <ScrollToPlankContext.Provider value={scrollToPlank}>
      <MaxPlankWidthContext.Provider value={maxPlankWidthPx}>
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
          ) : presentation === 'tiling' ? (
            <TilingDeck rendered={rendered} active={deck.active} weights={deck.tilingSizing} />
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
                    items={rendered}
                    Tile={DeckPlankTile}
                    draggable={false}
                  />
                </ScrollArea.Viewport>
              </ScrollArea.Root>
            </Mosaic.Container>
          )}
        </div>
      </MaxPlankWidthContext.Provider>
    </ScrollToPlankContext.Provider>
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
