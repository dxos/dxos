//
// Copyright 2025 DXOS.org
//

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { createContext } from '@radix-ui/react-context';
import { VirtuosoMasonry } from '@virtuoso.dev/masonry';
import React, {
  type ComponentPropsWithRef,
  type ComponentType,
  type ForwardedRef,
  type JSX,
  type PropsWithChildren,
  type Ref,
  forwardRef,
  useMemo,
  useRef,
} from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { type ThemedClassName, usePx } from '@dxos/react-ui';
import { cardMaxInlineSize, cardMinInlineSize } from '@dxos/ui-theme';
import { mx } from '@dxos/ui-theme';

//
// Context
//

const MASONRY_NAME = 'Masonry';

type MasonryContextValue = {
  Tile: ComponentType<{ data: any; index: number }>;
  columnWidthPx: number;
  maxColumnWidthPx: number;
  columnGutterPx: number;
  rowGutterPx: number;
  columnCount?: number;
  maxColumnCount?: number;
};

const [MasonryProvider, useMasonryContext] = createContext<MasonryContextValue>(MASONRY_NAME);

//
// Root
//

type MasonryRootProps = PropsWithChildren<{
  /** Render component for each masonry item. */
  Tile: ComponentType<{ data: any; index: number }>;
  /** Minimum column width in rem. */
  columnWidth?: number;
  /** Maximum column width in rem. */
  maxColumnWidth?: number;
  /** Horizontal space between columns in rem. */
  columnGutter?: number;
  /** Vertical space between rows in rem. Defaults to columnGutter. */
  rowGutter?: number;
  /** Override auto-calculated column count. */
  columnCount?: number;
  /** Upper bound on number of columns. */
  maxColumnCount?: number;
}>;

/** Converts rem layout props to px values. */
const useRemToPx = (remProps: Record<string, number | undefined>) => {
  const remInPx = usePx(1);
  return useMemo(() => {
    return Object.fromEntries(
      Object.entries(remProps)
        .filter(([_, value]) => Number.isFinite(value))
        .map(([key, value]) => [key, (value as number) * remInPx]),
    );
  }, [remProps, remInPx]);
};

const MasonryRoot = ({
  Tile,
  columnWidth = cardMinInlineSize,
  maxColumnWidth = cardMaxInlineSize,
  columnGutter = 1,
  rowGutter,
  columnCount,
  maxColumnCount,
  children,
}: MasonryRootProps) => {
  const remProps = useMemo(
    () => ({ columnWidth, maxColumnWidth, columnGutter, rowGutter: rowGutter ?? columnGutter }),
    [columnWidth, maxColumnWidth, columnGutter, rowGutter],
  );
  const pxProps = useRemToPx(remProps);

  return (
    <MasonryProvider
      Tile={Tile}
      columnWidthPx={pxProps.columnWidth ?? 0}
      maxColumnWidthPx={pxProps.maxColumnWidth ?? 0}
      columnGutterPx={pxProps.columnGutter ?? 0}
      rowGutterPx={pxProps.rowGutter ?? 0}
      columnCount={columnCount}
      maxColumnCount={maxColumnCount}
    >
      {children}
    </MasonryProvider>
  );
};

MasonryRoot.displayName = 'Masonry.Root';

//
// Content
//

type MasonryContentProps<Item> = ThemedClassName<ComponentPropsWithRef<'div'>> & {
  /** Items to render in the masonry grid. */
  items: Item[];
  /** Extract a stable key from an item, aligned with react-ui-mosaic's getId. */
  getId?: (data: Item) => string;
};

/** Compute column count from container width and column constraints. */
const useColumnCount = (
  containerWidth: number,
  columnWidthPx: number,
  maxColumnWidthPx: number,
  columnGutterPx: number,
  explicitColumnCount?: number,
  maxColumnCount?: number,
) => {
  return useMemo(() => {
    if (explicitColumnCount != null) {
      return explicitColumnCount;
    }
    if (containerWidth <= 0 || columnWidthPx <= 0) {
      return 1;
    }
    let cols = Math.floor((containerWidth + columnGutterPx) / (columnWidthPx + columnGutterPx));
    if (maxColumnWidthPx > 0) {
      const effectiveColWidth = (containerWidth - (cols - 1) * columnGutterPx) / cols;
      if (effectiveColWidth > maxColumnWidthPx) {
        cols = Math.ceil((containerWidth + columnGutterPx) / (maxColumnWidthPx + columnGutterPx));
      }
    }
    const clamped = maxColumnCount != null ? Math.min(cols, maxColumnCount) : cols;
    return Math.max(1, clamped);
  }, [containerWidth, columnWidthPx, maxColumnWidthPx, columnGutterPx, explicitColumnCount, maxColumnCount]);
};

const MasonryContentImpl = <Item,>(
  { items, getId, classNames, ...props }: MasonryContentProps<Item>,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) => {
  const { Tile, columnWidthPx, maxColumnWidthPx, columnGutterPx, rowGutterPx, columnCount, maxColumnCount } =
    useMasonryContext('Masonry.Content');

  const rootRef = useRef<HTMLDivElement | null>(null);
  const ref = useComposedRefs(rootRef, forwardedRef);
  const { width = 0 } = useResizeDetector({ targetRef: rootRef });
  const cols = useColumnCount(width, columnWidthPx, maxColumnWidthPx, columnGutterPx, columnCount, maxColumnCount);

  const TileAdapter = useMemo(() => {
    const Adapter = ({ data, index }: { data: Item; index: number }) => (
      <div style={{ padding: `${rowGutterPx / 2}px ${columnGutterPx / 2}px` }}>
        <Tile data={data} index={index} />
      </div>
    );
    Adapter.displayName = 'Masonry.TileAdapter';
    return Adapter;
  }, [Tile, rowGutterPx, columnGutterPx]);

  return (
    <div className={mx('relative h-full w-full', classNames)} {...props} ref={ref}>
      {width > 0 && (
        <div className='absolute inset-0'>
          <VirtuosoMasonry
            data={items}
            columnCount={cols}
            ItemContent={TileAdapter as any}
            style={{ height: '100%' }}
          />
        </div>
      )}
    </div>
  );
};

const MasonryContent = forwardRef(MasonryContentImpl) as <Item>(
  props: MasonryContentProps<Item> & {
    ref?: Ref<HTMLDivElement | null>;
  },
) => JSX.Element;

(MasonryContent as any).displayName = 'Masonry.Content';

//
// Masonry
//

export const Masonry = {
  Root: MasonryRoot,
  Content: MasonryContent,
};

export type { MasonryRootProps, MasonryContentProps };
