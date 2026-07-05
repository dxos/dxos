//
// Copyright 2025 DXOS.org
//

import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import { createContext } from '@radix-ui/react-context';
import React, {
  type ComponentType,
  type CSSProperties,
  type JSX,
  type PropsWithChildren,
  type Ref,
  useMemo,
  useRef,
} from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { ScrollArea, ScrollAreaRootProps, ThemedClassName, usePx } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { cardMaxInlineSize, cardMinInlineSize } from '@dxos/ui-theme';

import { useFlip } from './useFlip';
import { useMasonryLayout } from './useMasonryLayout';

//
// Context
//

type MasonryContextValue = {
  /** Render component for each masonry item. */
  Tile: ComponentType<{ data: any; index: number }>;
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
}: MasonryRootProps) => (
  <MasonryProvider
    Tile={Tile!}
    columns={columns}
    maxColumns={maxColumns}
    minColumnWidth={minColumnWidth}
    maxColumnWidth={maxColumnWidth}
    gap={gap}
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
}>;

const MasonryViewportInner = composable<HTMLDivElement, MasonryViewportProps<any>>(
  ({ items, getId, ...props }, forwardedRef) => {
    const { Tile, columns, maxColumns, minColumnWidth, maxColumnWidth, gap } = useMasonryContext('Masonry.Viewport');
    const remInPx = usePx(1);
    // Measure the viewport's own content box (net of padding and scrollbar) rather
    // than deriving it from the root width, so the grid tracks the actual available
    // width for any ScrollArea density (thin/scrollbars/padding) without duplicating
    // the theme's gutter math.
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const { width: contentWidth = 0 } = useResizeDetector({ targetRef: viewportRef });
    const columnCount = useColumnCount(contentWidth, columns, maxColumns, minColumnWidth, maxColumnWidth, gap);

    // The grid fills the measured content box; the layout caps columns at
    // `maxColumnWidth` and centres them, so no scrollbar/padding math is duplicated here.
    const gapPx = gap * remInPx;
    const ids = useMemo(() => items.map((item, index) => getId?.(item) ?? String(index)), [items, getId]);
    const { rects, columnWidth, height, getTileRef, nodes } = useMasonryLayout({
      ids,
      columnCount,
      containerWidth: contentWidth,
      gapPx,
      maxColumnWidthPx: maxColumnWidth * remInPx,
    });
    useFlip({ nodes, ids, rects, enabled: true });

    // Arrow-key navigation across tiles. Uses Tabster's `both` axis so all four
    // arrows move focus through the items as flat next/previous-focusable, giving
    // predictable wrap-around in DOM order.
    const arrowNavigationAttrs = useArrowNavigationGroup({
      axis: 'both',
      memorizeCurrent: true,
      tabbable: true,
    });

    // The viewport is the full-width scroll container; its centered+padded theme
    // (with `--gutter` set to the gap) balances the scrollbar into symmetric inline
    // gutters. The grid fills the content box and the layout centres capped columns,
    // so nothing overflows and left/right spacing matches the gap. The viewport always
    // renders so it can be measured; tiles render once a width is known.
    return (
      <ScrollArea.Viewport ref={viewportRef}>
        {contentWidth > 0 && (
          <div
            {...composableProps(props, {
              classNames: 'relative',
              style: { width: `${contentWidth}px`, height: `${height}px` },
            })}
            {...arrowNavigationAttrs}
            role='list'
            ref={forwardedRef}
          >
            {items.map((item, index) => {
              const id = ids[index];
              const rect = rects[index];
              return (
                <div
                  key={id}
                  // Let the tile clamp its card: a card's own min-width must not exceed
                  // the column, or a narrow (single-column, mobile) container overflows
                  // and shows a horizontal scrollbar.
                  className='[&>*]:min-w-0!'
                  ref={getTileRef(id)}
                  role='listitem'
                  style={{
                    position: 'absolute',
                    insetBlockStart: 0,
                    insetInlineStart: 0,
                    width: `${columnWidth}px`,
                    transform: rect ? `translate(${rect.x}px, ${rect.y}px)` : undefined,
                  }}
                >
                  <Tile index={index} data={item} />
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea.Viewport>
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
