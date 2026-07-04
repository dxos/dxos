//
// Copyright 2025 DXOS.org
//

import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { createContext } from '@radix-ui/react-context';
import React, { type ComponentType, type JSX, type PropsWithChildren, type Ref, useMemo, useRef } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { ScrollArea, ScrollAreaRootProps, ThemedClassName, usePx } from '@dxos/react-ui';
import { composable, composableProps, scrollbar } from '@dxos/react-ui';
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
  /** Space between columns and rows in rem. */
  gutter: number;
};

const MASONRY_NAME = 'Masonry';

const [MasonryProvider, useMasonryContext] = createContext<MasonryContextValue>(MASONRY_NAME);

/** Content-scoped context: measured width of the ScrollArea.Root, shared with Viewport. */
type MasonryContentContextValue = {
  width: number;
};

const [MasonryContentProvider, useMasonryContentContext] = createContext<MasonryContentContextValue>('Masonry.Content');

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
  gutter = 0.75,
}: MasonryRootProps) => (
  <MasonryProvider
    Tile={Tile!}
    columns={columns}
    maxColumns={maxColumns}
    minColumnWidth={minColumnWidth}
    maxColumnWidth={maxColumnWidth}
    gutter={gutter}
  >
    {children}
  </MasonryProvider>
);

MasonryRoot.displayName = 'Masonry.Root';

//
// Content
//
// The outer wrapper: renders the ScrollArea.Root, measures available width,
// and publishes that width via context for Masonry.Viewport to consume.
// Style this layer (centered/thin/padding) to control the scroll container.
//

type MasonryContentProps = ThemedClassName<
  PropsWithChildren<Pick<ScrollAreaRootProps, 'scrollbars' | 'centered' | 'thin' | 'padding'>>
>;

const MasonryContentInner = composable<HTMLDivElement, MasonryContentProps>(
  ({ children, scrollbars, centered, thin = true, padding = true, ...props }, forwardedRef) => {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const composedRef = useComposedRefs(rootRef, forwardedRef);
    const { width = 0 } = useResizeDetector({ targetRef: rootRef });

    return (
      <ScrollArea.Root
        {...composableProps(props, { classNames: 'pt-trim-md' })}
        scrollbars={scrollbars}
        centered={centered}
        thin={thin}
        padding={padding}
        ref={composedRef}
      >
        <MasonryContentProvider width={width}>{children}</MasonryContentProvider>
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
    const { Tile, columns, maxColumns, minColumnWidth, maxColumnWidth, gutter } = useMasonryContext('Masonry.Viewport');
    const { width } = useMasonryContentContext('Masonry.Viewport');
    const remInPx = usePx(1);
    const contentWidth = width - (scrollbar.md.size + scrollbar.md.padding);
    const columnCount = useColumnCount(contentWidth, columns, maxColumns, minColumnWidth, maxColumnWidth, gutter);

    // Cap each column at `maxColumnWidth` and center the grid so it doesn't stretch
    // to the far edge when the container is wider than the natural card width.
    const gutterPx = gutter * remInPx;
    const rawColumnWidth = (contentWidth - (columnCount - 1) * gutterPx) / columnCount;
    const cappedColumnWidth = Math.min(rawColumnWidth, maxColumnWidth * remInPx);
    const gridWidth = columnCount * cappedColumnWidth + (columnCount - 1) * gutterPx;

    const ids = useMemo(() => items.map((item, index) => getId?.(item) ?? String(index)), [items, getId]);
    const { rects, columnWidth, height, getTileRef, nodes } = useMasonryLayout({
      ids,
      columnCount,
      containerWidth: gridWidth,
      gutterPx,
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

    if (width <= 0) {
      return null;
    }

    return (
      <ScrollArea.Viewport asChild>
        <div
          {...composableProps(props, {
            classNames: 'relative mx-auto',
            style: { width: `${gridWidth}px`, height: `${height}px` },
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
  gutter: number,
) => {
  const remInPx = usePx(1);
  return useMemo(() => {
    if (columns != null) {
      return columns;
    }

    const minColumnWidthPx = minColumnWidth * remInPx;
    const maxColumnWidthPx = maxColumnWidth * remInPx;
    const gutterPx = gutter * remInPx;
    if (width <= 0 || minColumnWidthPx <= 0) {
      return 1;
    }

    // Each tile has paddingRight: gutter, so every slot (including the last) occupies
    // (colWidth + gutterPx). The container therefore fits floor(containerWidth / (colWidth + gutterPx)) columns.
    let cols = Math.floor(width / (minColumnWidthPx + gutterPx));
    if (maxColumnWidthPx > 0) {
      const effectiveColWidth = width / cols - gutterPx;
      if (effectiveColWidth > maxColumnWidthPx) {
        // Try to add columns to keep cards below maxColumnWidth, but never violate minColumnWidth.
        const maxCols = Math.ceil(width / (maxColumnWidthPx + gutterPx));
        if (width / maxCols - gutterPx >= minColumnWidthPx) {
          cols = maxCols;
        }
      }
    }

    const clamped = maxColumns != null ? Math.min(cols, maxColumns) : cols;
    return Math.max(1, clamped);
  }, [remInPx, width, columns, maxColumns, minColumnWidth, maxColumnWidth, gutter]);
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
