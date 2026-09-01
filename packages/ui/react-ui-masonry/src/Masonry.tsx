//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, {
  type ComponentType,
  type CSSProperties,
  type JSX,
  type MouseEvent,
  type PropsWithChildren,
  type Ref,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { useFocusGroup } from '@dxos/react-focus';
import { ScrollArea, ScrollAreaRootProps, ThemedClassName, usePx } from '@dxos/react-ui';
import { composable, composableProps, useMergeRefs } from '@dxos/react-ui';
import { cardMaxInlineSize, cardMinInlineSize } from '@dxos/ui-theme';

import { prefersReducedMotion, useFlip } from './useFlip.ts';
import { useMasonryLayout } from './useMasonryLayout.ts';

/** Reveal the grid once the layout has been stable for this long (the initial reflow has settled). */
const REVEAL_SETTLE_MS = 80;

/** Reveal the grid no later than this after mount, so churning content never hides it indefinitely. */
const REVEAL_DEADLINE_MS = 1200;

//
// Context
//

type MasonryContextValue = {
  /** Render component for each masonry item. Receives `selected` when the grid is selectable. */
  Tile: ComponentType<{ data: any; index: number; selected?: boolean }>;
  /** Override auto-calculated column count. */
  columns: number | undefined;
  /** Upper bound on number of columns. */
  maxColumns: number | undefined;
  /** Minimum column width in rem. */
  minColumnWidth: number;
  /** Maximum column width in rem. */
  maxColumnWidth: number;
  /** Space applied uniformly between tiles and around the grid perimeter, in rem. */
  gap: number;
  /**
   * Animate reflow when a small number of tiles are added or removed. Disabled, or on a
   * bulk change (initial render, data swap) or resize, tiles snap to position instead.
   */
  animate: boolean;
  /**
   * Centre the columns when `maxColumnWidth` caps them narrower than the container. Off aligns them
   * to the start instead, which reads better when the grid sits in a form or list flow whose other
   * rows are start-aligned. Distinct from `Masonry.Content`'s `centered`, which is ScrollArea's
   * scrollbar-padding balance and says nothing about column alignment.
   */
  centered: boolean;
};

const MASONRY_NAME = 'Masonry';

const [MasonryProvider, useMasonryContext] = createContext<MasonryContextValue>(MASONRY_NAME);

//
// Root
//

type MasonryRootProps = PropsWithChildren<Partial<MasonryContextValue>>;

const MasonryRoot = ({
  children,
  Tile,
  columns = undefined,
  maxColumns = undefined,
  minColumnWidth = cardMinInlineSize,
  maxColumnWidth = cardMaxInlineSize,
  gap = 0.75,
  animate = true,
  centered = true,
}: MasonryRootProps) => (
  <MasonryProvider
    Tile={Tile!}
    columns={columns}
    maxColumns={maxColumns}
    minColumnWidth={minColumnWidth}
    maxColumnWidth={maxColumnWidth}
    gap={gap}
    animate={animate}
    centered={centered}
  >
    {children}
  </MasonryProvider>
);

MasonryRoot.displayName = 'Masonry.Root';

//
// Content
//
// The outer wrapper: renders the ScrollArea.Root. Style this layer
// (centered/thin/padding) to control the scroll container; the Viewport measures
// its own content box, so scrollbar width and padding are accounted for whatever
// density is configured here.
//

type MasonryContentProps = ThemedClassName<
  PropsWithChildren<Pick<ScrollAreaRootProps, 'scrollbars' | 'centered' | 'thin' | 'padding'>>
>;

const MasonryContentInner = composable<HTMLDivElement, MasonryContentProps>(
  ({ children, scrollbars, centered = true, thin = true, padding = true, ...props }, forwardedRef) => {
    const { gap } = useMasonryContext('Masonry.Content');
    return (
      <ScrollArea.Root
        // Drive the ScrollArea gutter to the grid gap so the left/right perimeter
        // matches the inter-column gap: the centered+padding theme resolves this to
        // pl = gap and pr = gap - scrollbar, keeping both sides symmetric with the
        // scrollbar accounted for at any density. Cast: CSSProperties has no index
        // signature for CSS custom properties, so `--gutter` cannot be typed directly.
        {...composableProps(props, { style: { '--gutter': `${gap}rem` } as CSSProperties })}
        scrollbars={scrollbars}
        centered={centered}
        thin={thin}
        padding={padding}
        ref={forwardedRef}
      >
        {children}
      </ScrollArea.Root>
    );
  },
);

MasonryContentInner.displayName = 'Masonry.Content';

const MasonryContent = MasonryContentInner as (
  props: MasonryContentProps & {
    ref?: Ref<HTMLDivElement | null>;
  },
) => JSX.Element;

//
// Viewport
//
// The inner render layer: renders the ScrollArea.Viewport wrapped around the
// absolute layout engine. Each tile is positioned with translate(x, y) into a
// balanced (shortest-column-first) grid; reflow is animated with FLIP. Style
// this layer separately from Content to control the tile grid.
//

type MasonryViewportProps<Item> = ThemedClassName<{
  /** Items to render in the masonry grid. */
  items: readonly Item[];
  /** Extract a stable key from an item, aligned with react-ui-mosaic's getId. */
  getId?: (data: Item) => string;
  /**
   * Scope for remembering tile heights across mounts, e.g. the collection's URI. With one, a
   * remount renders on the first frame instead of waiting for the layout to settle. Omit it when
   * `getId` is omitted: the default index ids are not unique across grids.
   */
  cacheKey?: string;
  /**
   * Ids of the currently-selected tiles. When `onSelect` is also provided the grid becomes
   * selectable: selected tiles render an outline + `aria-selected`, and clicking a tile emits
   * {@link onSelect}. Selection STATE (single/multi semantics) is owned by the consumer — pair this
   * with `useListSelection` from `@dxos/react-ui-list`.
   */
  selectedIds?: ReadonlySet<string>;
  /** Emitted when a tile is clicked while selectable. The consumer toggles its own selection state. */
  onSelect?: (id: string, event: MouseEvent) => void;
  /**
   * Whether this layer owns scrolling. Set `false` when an ancestor already scrolls (e.g. a form's
   * viewport) to render the grid in a plain full-width block instead of a nested scroll container —
   * the `ScrollArea.Root` that `Masonry.Content` provides is then not needed. Nesting scroll
   * containers also risks collapsing the measured width to the scrollbar gutter, which would
   * suppress the grid entirely (see the width gate below).
   * @default true
   */
  scroll?: boolean;
}>;

const MasonryViewportInner = composable<HTMLDivElement, MasonryViewportProps<any>>(
  ({ items, getId, cacheKey, selectedIds, onSelect, scroll = true, ...props }, forwardedRef) => {
    const { Tile, columns, maxColumns, minColumnWidth, maxColumnWidth, gap, animate, centered } =
      useMasonryContext('Masonry.Viewport');
    const remInPx = usePx(1);
    // Measure the viewport's own content box (net of padding and scrollbar) rather
    // than deriving it from the root width, so the grid tracks the actual available
    // width for any ScrollArea density (thin/scrollbars/padding) without duplicating
    // the theme's gutter math.
    const viewportRef = useRef<HTMLDivElement | null>(null);
    // Throttle width changes: each update recomputes the column count and the full tile layout,
    // so coalesce rapid resizes (drag, ScrollArea reflow) into at most one relayout per interval.
    const { width: contentWidth = 0 } = useResizeDetector({
      targetRef: viewportRef,
      refreshMode: 'throttle',
      refreshRate: 200,
    });
    const columnCount = useColumnCount(contentWidth, columns, maxColumns, minColumnWidth, maxColumnWidth, gap);

    // The grid fills the measured content box; the layout caps columns at
    // `maxColumnWidth` and centres them, so no scrollbar/padding math is duplicated here.
    const gapPx = gap * remInPx;
    const ids = useMemo(() => items.map((item, index) => getId?.(item) ?? String(index)), [items, getId]);
    const { rects, columnWidth, height, getTileRef, nodes, measured, knownIds } = useMasonryLayout({
      ids,
      columnCount,
      containerWidth: contentWidth,
      gapPx,
      maxColumnWidthPx: maxColumnWidth * remInPx,
      centered,
      cacheKey,
    });
    useFlip({ nodes, ids, rects, columnCount, containerWidth: contentWidth, enabled: animate });

    // Hide the grid until the layout stops changing, then fade in; latch on so later edits never
    // re-hide it. Revealing on the first measurement is not enough: tiles mount collapsed (their
    // poster reserves height a frame later), so the first pass stacks them bunched at the top and
    // only settles over the next few reflows. Debounce on `rects` identity — which changes on every
    // relayout — and reveal once it has been stable for a beat, with a hard deadline as a backstop.
    //
    // None of that applies when every tile's height was already known on the first pass (the height
    // cache is warm from an earlier mount): the layout is final before paint, so waiting for it to
    // settle would just be a delay. That is the common case after the first visit.
    const [revealed, setRevealed] = useState(false);
    const firstPass = useRef(true);
    useEffect(() => {
      if (revealed) {
        return;
      }
      // Nothing has been laid out until the viewport reports a width, so this does not count as the
      // first pass — consuming it here would forfeit the fast path on every mount.
      if (contentWidth <= 0) {
        return;
      }
      if (!measured) {
        firstPass.current = false;
        return;
      }
      if (firstPass.current) {
        setRevealed(true);
        return;
      }
      const timer = setTimeout(() => setRevealed(true), REVEAL_SETTLE_MS);
      return () => clearTimeout(timer);
    }, [revealed, measured, rects, contentWidth]);
    useEffect(() => {
      const deadline = setTimeout(() => setRevealed(true), REVEAL_DEADLINE_MS);
      return () => clearTimeout(deadline);
    }, []);

    // Arrow-key navigation across tiles. The `both` axis moves focus through the items as flat
    // next/previous in DOM order on all four arrows; `tabbable` keeps each tile its own tab stop.
    const { ref: focusGroupRef, ...focusGroupProps } = useFocusGroup({
      axis: 'both',
      memorizeCurrent: true,
      tabbable: true,
      cyclic: true,
    });
    const gridRef = useMergeRefs<HTMLDivElement>([forwardedRef, focusGroupRef]);

    // The viewport is the full-width scroll container; its centered+padded theme
    // (with `--gutter` set to the gap) balances the scrollbar into symmetric inline
    // gutters. The grid fills the content box and the layout centres capped columns,
    // so nothing overflows and left/right spacing matches the gap. The viewport always
    // renders so it can be measured; tiles render once a width is known.
    const grid = (
      <>
        {contentWidth > 0 && (
          <div
            {...composableProps(props, {
              classNames: 'relative',
              style: {
                width: `${contentWidth}px`,
                height: `${height}px`,
                opacity: revealed ? 1 : 0,
                // Hidden (not just transparent) before reveal so the settling tiles are neither
                // focusable nor hit-testable; the opacity fade only runs when motion is allowed.
                visibility: revealed ? 'visible' : 'hidden',
                transition: animate && !prefersReducedMotion() ? 'opacity 200ms cubic-bezier(0.2, 0, 0, 1)' : undefined,
              },
            })}
            {...focusGroupProps}
            role='list'
            ref={gridRef}
          >
            {items.map((item, index) => {
              const id = ids[index];
              const rect = rects[index];
              const selectable = !!onSelect;
              const selected = selectedIds?.has(id) ?? false;
              // A tile with no height at all — never measured, nothing remembered — is positioned by
              // a guess. Painting that guess is what flashed a tile hundreds of pixels out of place
              // when the item set was swapped wholesale. A remembered height from another width is
              // close enough to paint, so a resize reflows in place instead of blanking.
              // `visibility` rather than `display`, so the ResizeObserver can still measure it.
              const estimated = !knownIds.has(id);
              return (
                <div
                  key={id}
                  // Let the tile clamp its card: a card's own min-width must not exceed
                  // the column, or a narrow (single-column, mobile) container overflows
                  // and shows a horizontal scrollbar.
                  className={[
                    '[&>*]:min-w-0!',
                    selectable && 'cursor-pointer',
                    selected && 'rounded-md ring-2 ring-inset ring-primary-500',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  ref={getTileRef(id)}
                  role='listitem'
                  aria-selected={selectable ? selected : undefined}
                  onClick={onSelect ? (event) => onSelect(id, event) : undefined}
                  style={{
                    position: 'absolute',
                    insetBlockStart: 0,
                    insetInlineStart: 0,
                    width: `${columnWidth}px`,
                    transform: rect ? `translate(${rect.x}px, ${rect.y}px)` : undefined,
                    visibility: estimated ? 'hidden' : undefined,
                  }}
                >
                  <Tile index={index} data={item} selected={selected} />
                </div>
              );
            })}
          </div>
        )}
      </>
    );

    // Not `dx-expand` in the non-scrolling case: the width gate needs a definite inline size
    // (`w-full min-w-0`) without claiming the block axis, which would fight the surrounding flow —
    // the grid's height comes from the computed layout.
    return scroll ? (
      <ScrollArea.Viewport ref={viewportRef}>{grid}</ScrollArea.Viewport>
    ) : (
      <div className='flex-1 w-full min-w-0' ref={viewportRef}>
        {grid}
      </div>
    );
  },
);

MasonryViewportInner.displayName = 'Masonry.Viewport';

const MasonryViewport = MasonryViewportInner as <Item>(
  props: MasonryViewportProps<Item> & {
    ref?: Ref<HTMLDivElement | null>;
  },
) => JSX.Element;

/** Compute column count from container width and column constraints. */
const useColumnCount = (
  width: number,
  columns: number | undefined,
  maxColumns: number | undefined,
  minColumnWidth: number,
  maxColumnWidth: number,
  gap: number,
) => {
  const remInPx = usePx(1);
  return useMemo(() => {
    if (columns != null) {
      return columns;
    }

    const minColumnWidthPx = minColumnWidth * remInPx;
    const maxColumnWidthPx = maxColumnWidth * remInPx;
    const gapPx = gap * remInPx;
    if (width <= 0 || minColumnWidthPx <= 0) {
      return 1;
    }

    // `width` is the content box; the outer perimeter is owned by the scroll
    // container, so only interior gaps count: N columns fit when
    // N * colWidth + (N - 1) * gap <= width, i.e. N <= (width + gap) / (colWidth + gap).
    let cols = Math.max(1, Math.floor((width + gapPx) / (minColumnWidthPx + gapPx)));
    if (maxColumnWidthPx > 0) {
      const effectiveColWidth = (width - (cols - 1) * gapPx) / cols;
      if (effectiveColWidth > maxColumnWidthPx) {
        // Try to add columns to keep cards below maxColumnWidth, but never violate minColumnWidth.
        const maxCols = Math.ceil((width + gapPx) / (maxColumnWidthPx + gapPx));
        if ((width - (maxCols - 1) * gapPx) / maxCols >= minColumnWidthPx) {
          cols = maxCols;
        }
      }
    }

    const clamped = maxColumns != null ? Math.min(cols, maxColumns) : cols;
    return Math.max(1, clamped);
  }, [remInPx, width, columns, maxColumns, minColumnWidth, maxColumnWidth, gap]);
};

//
// Masonry
//

export const Masonry = {
  Root: MasonryRoot,
  Content: MasonryContent,
  Viewport: MasonryViewport,
};

export type { MasonryContentProps, MasonryRootProps, MasonryViewportProps };
