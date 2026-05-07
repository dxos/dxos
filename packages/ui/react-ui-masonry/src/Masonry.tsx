//
// Copyright 2025 DXOS.org
//

import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { createContext } from '@radix-ui/react-context';
import { VirtuosoMasonry, type VirtuosoMasonryProps } from '@virtuoso.dev/masonry';
import React, { type ComponentType, type JSX, type PropsWithChildren, type Ref, useMemo, useRef } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { ScrollArea, ScrollAreaRootProps, ThemedClassName, usePx } from '@dxos/react-ui';
import { cardMaxInlineSize, cardMinInlineSize, composable, composableProps, scrollbar } from '@dxos/ui-theme';

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
  PropsWithChildren<Pick<ScrollAreaRootProps, 'centered' | 'thin' | 'padding'>>
>;

const MasonryContentInner = composable<HTMLDivElement, MasonryContentProps>(
  ({ children, centered, thin = true, padding = true, ...props }, forwardedRef) => {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const composedRef = useComposedRefs(rootRef, forwardedRef);
    const { width = 0 } = useResizeDetector({ targetRef: rootRef });

    // NOTE: Masonry currently doesn't support an external scroller.
    //  https://github.com/petyosi/react-virtuoso/issues/1305
    return (
      <ScrollArea.Root {...composableProps(props)} centered={centered} thin={thin} padding={padding} ref={composedRef}>
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
// The inner render layer: renders the ScrollArea.Viewport wrapped around
// VirtuosoMasonry. Style this layer separately from Content to control
// the tile grid (e.g. inner padding, alignment).
//

type MasonryViewportProps<Item> = ThemedClassName<{
  /** Items to render in the masonry grid. */
  items: Item[];
  /** Extract a stable key from an item, aligned with react-ui-mosaic's getId. */
  getId?: (data: Item) => string;
}>;

const MasonryViewportInner = composable<HTMLDivElement, MasonryViewportProps<any>>(
  ({ items, getId, ...props }, forwardedRef) => {
    const { Tile, columns, maxColumns, minColumnWidth, maxColumnWidth, gutter } = useMasonryContext('Masonry.Viewport');
    const { width } = useMasonryContentContext('Masonry.Viewport');
    const columnCount = useColumnCount(
      width - (scrollbar.thin.size + scrollbar.thin.padding),
      columns,
      maxColumns,
      minColumnWidth,
      maxColumnWidth,
      gutter,
    );

    // Arrow-key navigation across tiles. Uses Tabster's `both` axis so all
    // four arrows move focus through the items. True 2D (grid) axis doesn't
    // work inside a masonry because VirtuosoMasonry lays items out column-
    // first in the DOM — tabster's Grid direction requires the next DOM
    // element to be to the right of the current for ArrowRight, which is
    // never the case between columns here. `both` treats the keys as flat
    // next/previous-focusable, which gives predictable wrap-around in DOM
    // order for all four directions.
    const arrowNavigationAttrs = useArrowNavigationGroup({
      axis: 'both',
      memorizeCurrent: true,
      tabbable: true,
    });

    const TileAdapter = useMemo(() => {
      const Adapter = ({ data, index }: { data: any; index: number }) => (
        <div role='listitem' style={{ paddingBottom: `${gutter}rem` }}>
          <Tile index={index} data={data} />
        </div>
      );
      Adapter.displayName = 'Masonry.TileAdapter';
      return Adapter;
    }, [Tile, gutter]);

    if (width <= 0) {
      return null;
    }

    return (
      <ScrollArea.Viewport asChild>
        <ComposableVirtuosoMasonry
          {...arrowNavigationAttrs}
          {...composableProps(props)}
          ref={forwardedRef}
          style={{ gap: `${gutter}rem` }}
          data={items}
          columnCount={columnCount}
          ItemContent={TileAdapter}
        />
      </ScrollArea.Viewport>
    );
  },
);

const ComposableVirtuosoMasonry = composable<HTMLDivElement, VirtuosoMasonryProps<any, any>>(
  ({ ...props }, _forwardedRef) => {
    return <VirtuosoMasonry {...props} />;
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

export type { MasonryRootProps, MasonryContentProps, MasonryViewportProps };
