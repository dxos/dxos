//
// Copyright 2025 DXOS.org
//

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { createContext } from '@radix-ui/react-context';
import { VirtuosoMasonry, type VirtuosoMasonryProps } from '@virtuoso.dev/masonry';
import React, { type ComponentType, type JSX, type PropsWithChildren, type Ref, useMemo, useRef } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { ScrollArea, usePx } from '@dxos/react-ui';
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

type MasonryContentProps<Item> = {
  /** Items to render in the masonry grid. */
  items: Item[];
  /** Extract a stable key from an item, aligned with react-ui-mosaic's getId. */
  getId?: (data: Item) => string;
};

const MasonryContentInner = composable<HTMLDivElement, MasonryContentProps<any>>(
  ({ items, getId, ...props }, forwardedRef) => {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const composedRef = useComposedRefs(rootRef, forwardedRef);
    const { width = 0 } = useResizeDetector({ targetRef: rootRef });

    const { Tile, columns, maxColumns, minColumnWidth, maxColumnWidth, gutter } = useMasonryContext('Masonry.Content');
    const columnCount = useColumnCount(
      width - (scrollbar.thin.size + scrollbar.thin.padding),
      columns,
      maxColumns,
      minColumnWidth,
      maxColumnWidth,
      gutter,
    );

    const TileAdapter = useMemo(() => {
      const Adapter = ({ data, index }: { data: any; index: number }) => {
        return (
          <div role='listitem' style={{ paddingBottom: `${gutter}rem` }}>
            <Tile index={index} data={data} />
          </div>
        );
      };
      Adapter.displayName = 'Masonry.TileAdapter';
      return Adapter;
    }, [Tile, gutter]);

    // TODO(burdon): Masonry currently doesn't support an external scroller.
    //  https://github.com/petyosi/react-virtuoso/issues/1305
    if (columns === 1) {
      return <VirtuosoMasonry data={items} columnCount={1} ItemContent={TileAdapter} useWindowScroll />;
    }

    return (
      <ScrollArea.Root {...composableProps(props, { classNames: 'w-' })} thin padding ref={composedRef}>
        <ScrollArea.Viewport asChild>
          {width > 0 && (
            <ComposableVirtuosoMasonry
              style={{ gap: `${gutter}rem` }}
              data={items}
              columnCount={columnCount}
              ItemContent={TileAdapter}
            />
          )}
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    );
  },
);

const ComposableVirtuosoMasonry = composable<HTMLDivElement, VirtuosoMasonryProps<any, any>>(({ ...props }) => {
  return <VirtuosoMasonry {...props} />;
});

MasonryContentInner.displayName = 'Masonry.Content';

const MasonryContent = MasonryContentInner as <Item>(
  props: MasonryContentProps<Item> & {
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
};

export type { MasonryRootProps, MasonryContentProps };
