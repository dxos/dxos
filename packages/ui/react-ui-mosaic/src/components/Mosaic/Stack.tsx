//
// Copyright 2026 DXOS.org
//

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { type ReactVirtualizerOptions, useVirtualizer } from '@tanstack/react-virtual';
import React, {
  type FC,
  forwardRef,
  Fragment,
  type ReactElement,
  type Ref,
  useCallback,
  useEffect,
  useRef,
} from 'react';

import { invariant } from '@dxos/invariant';
import { type Axis, type ThemedClassName } from '@dxos/react-ui';
import { composable, composableProps, mx } from '@dxos/ui-theme';

import { useVisibleItems } from '../../hooks';
import { useMosaicContainerContext } from './Container';
import { MosaicPlaceholder, type MosaicPlaceholderProps } from './Placeholder';
import { styles } from './styles';
import { type MosaicTileProps } from './Tile';
import { type GetId } from './types';

//
// Mosaic Drag-and-drop
//
// Drop targets:
// - Placeholders exist to allow gaps but prevent deadspace when dragging within a container.
// - When dragging over a Tile, the placeholder next to the closest edge is activated.
// - Placeholders expand when active; event handlers are disabled while the container is scrolling.
//
// [Container]
// - [Placeholder 0.5]
// - [Tile        1  ]
// - [Placeholder 1.5]
// - [Tile        2  ]
// - [Placeholder 2.5]
// - [Tile        3  ]
// - [Placeholder 3.5]
//
// Implementation Notes
// - We use [Radix composition](https://www.radix-ui.com/primitives/docs/guides/composition) to factor out composible aspects (e.g., Focus, Mosaic, etc.)
// - NOTE: Use Slottable only if needed to disambiguate; otherwise a suspected Radix bug causes compositional problems.

const MOSAIC_STACK_NAME = 'MosaicStack';

type MosaicStackTileComponent<TData = any> = FC<MosaicTileProps<TData>>;

type MosaicStackProps<TData = any> = ThemedClassName<
  {
    role?: string;
    getId: GetId<TData>;
    orientation?: Axis;
    items?: readonly TData[];
    Tile: MosaicStackTileComponent<TData>;
  } & Pick<MosaicTileProps<TData>, 'draggable' | 'debug'>
>;

/**
 * Linear layout of Mosaic tiles.
 * NOTE: This is a low-level component and should be wrapped by a scrollable container.
 */
const MosaicStackInner = composable<HTMLDivElement, MosaicStackProps>(
  (
    { getId, orientation: orientationProp = 'vertical', items, Tile, draggable = true, debug, ...props },
    forwardedRef,
  ) => {
    invariant(Tile);
    const {
      id,
      orientation = orientationProp,
      dragging,
      currentId,
      registerScrollTo,
    } = useMosaicContainerContext(MOSAIC_STACK_NAME);
    const visibleItems = useVisibleItems({ id, items, dragging: dragging?.source.data, getId });
    invariant(orientation === 'vertical' || orientation === 'horizontal', `Invalid orientation: ${orientation}`);

    const rootRef = useRef<HTMLDivElement>(null);
    const scrollToId = useCallback((targetId: string) => {
      const el = rootRef.current?.querySelector<HTMLElement>(`[data-mosaic-tile-id="${CSS.escape(targetId)}"]`);
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, []);

    useEffect(() => {
      registerScrollTo(scrollToId);
      return () => registerScrollTo(undefined);
    }, [registerScrollTo, scrollToId]);

    const composedRef = useComposedRefs(rootRef, forwardedRef);
    return (
      <div
        {...composableProps(props, {
          role: 'list',
          classNames: [
            'flex',
            orientation === 'horizontal' && 'h-full [&>*]:shrink-0',
            orientation === 'vertical' && 'flex-col',
          ],
        })}
        ref={composedRef}
      >
        {draggable && <InternalPlaceholder orientation={orientation} location={0.5} />}
        {visibleItems?.map((item, index) => (
          <Fragment key={getId(item)}>
            <Tile
              id={getId(item)}
              data={item}
              location={index + 1}
              draggable={draggable}
              current={getId(item) === currentId}
              debug={debug}
            />
            {draggable && <InternalPlaceholder orientation={orientation} location={index + 1.5} />}
          </Fragment>
        ))}
      </div>
    );
  },
);

MosaicStackInner.displayName = MOSAIC_STACK_NAME;

const MosaicStack = MosaicStackInner as <TData = any>(
  props: MosaicStackProps<TData> & { ref?: Ref<HTMLDivElement> },
) => ReactElement;

//
// VirtualStack
//

const MOSAIC_VIRTUAL_STACK_NAME = 'MosaicVirtualStack';

type MosaicVirtualStackProps<TData = any> = MosaicStackProps<TData> &
  Pick<
    ReactVirtualizerOptions<HTMLElement, HTMLDivElement>,
    'estimateSize' | 'gap' | 'getScrollElement' | 'overscan' | 'onChange'
  >;

const MosaicVirtualStackInner = forwardRef<HTMLDivElement, MosaicVirtualStackProps>(
  (
    {
      orientation = 'vertical',
      items,
      getId,
      Tile,
      estimateSize,
      getScrollElement,
      overscan = 8,
      gap,
      onChange,
      draggable = true,
      debug,
      ...props
    },
    forwardedRef,
  ) => {
    invariant(Tile);
    const { id, dragging, currentId, registerScrollTo } = useMosaicContainerContext(MOSAIC_VIRTUAL_STACK_NAME);
    const visibleItems = useVisibleItems({ id, items, dragging: dragging?.source.data, getId });
    // In draggable mode virtual indices alternate: even=placeholder, odd=tile.
    // Wrap estimateSize so placeholders get 0 (their actual negligible height) and
    // tile slots receive the caller's estimate at the correct tile index.
    // This keeps getTotalSize() stable as items are measured → no scrollbar drift.
    const wrappedEstimateSize = draggable
      ? (index: number) => (index % 2 === 0 ? 0 : estimateSize(Math.floor(index / 2)))
      : estimateSize;

    const virtualizer = useVirtualizer({
      // NOTE: When draggable we double the number of items to allow for placeholders.
      count: draggable ? visibleItems.length * 2 + 1 : visibleItems.length,
      estimateSize: wrappedEstimateSize,
      gap,
      // Key measurements by stable item ID so the size cache survives scrolling;
      // without this, measurements are indexed by position and are lost when items reorder.
      getItemKey: draggable
        ? (index) => (index % 2 === 0 ? `ph-${index}` : getId(visibleItems![Math.floor(index / 2)]))
        : (index) => getId(visibleItems![index]),
      getScrollElement,
      overscan,
      onChange,
    });

    // Register scroll-to-item via virtualizer index lookup.
    const scrollToId = useCallback(
      (targetId: string) => {
        const itemIndex = visibleItems.findIndex((item) => getId(item) === targetId);
        if (itemIndex >= 0) {
          const virtualIndex = draggable ? itemIndex * 2 + 1 : itemIndex;
          virtualizer.scrollToIndex(virtualIndex, { align: 'start', behavior: 'smooth' });
        }
      },
      [visibleItems, getId, draggable, virtualizer],
    );

    useEffect(() => {
      registerScrollTo(scrollToId);
      return () => registerScrollTo(undefined);
    }, [registerScrollTo, scrollToId]);

    const virtualItems = virtualizer.getVirtualItems();
    const getData = (index: number): { data?: any; location: number } => {
      if (draggable) {
        if (index % 2 === 0) {
          return { location: Math.floor(index / 2) + 0.5 };
        } else {
          return { data: visibleItems![Math.floor(index / 2)], location: Math.floor(index / 2) + 1 };
        }
      } else {
        return { data: visibleItems![index], location: index + 1 };
      }
    };

    return (
      <div
        {...composableProps(props, {
          role: 'list',
          classNames: [
            // shrink-0 is required: this div sets an explicit height via inline style (getTotalSize).
            // Without it, a parent flex container (e.g. ScrollArea.Viewport) would shrink this div
            // to the viewport height, collapsing the scroll content and causing scrollbar drift.
            'flex shrink-0',
            orientation === 'horizontal' && 'h-full [&>*]:shrink-0',
            orientation === 'vertical' && 'flex-col',
          ],
        })}
        style={{
          position: 'relative',
          ...(orientation === 'vertical'
            ? {
                width: '100%',
                height: virtualizer.getTotalSize(),
              }
            : {
                width: virtualizer.getTotalSize(),
                height: '100%',
              }),
        }}
        ref={forwardedRef}
      >
        {virtualItems.map(({ key, index, start }) => {
          const { data, location } = getData(index);
          return (
            <div
              key={key}
              data-index={index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                ...(orientation === 'vertical'
                  ? {
                      width: '100%',
                      transform: `translateY(${start}px)`,
                    }
                  : {
                      height: '100%',
                      transform: `translateX(${start}px)`,
                    }),
              }}
              ref={virtualizer.measureElement}
            >
              {data ? (
                <Tile
                  id={getId(data)}
                  data={data}
                  location={location}
                  draggable={draggable}
                  current={getId(data) === currentId}
                  debug={debug}
                />
              ) : (
                <InternalPlaceholder orientation={orientation} location={location} />
              )}
            </div>
          );
        })}
      </div>
    );
  },
);

MosaicVirtualStackInner.displayName = MOSAIC_VIRTUAL_STACK_NAME;

const MosaicVirtualStack = MosaicVirtualStackInner as <TData = any>(
  props: MosaicVirtualStackProps<TData> & { ref?: Ref<HTMLDivElement> },
) => ReactElement;
(MosaicVirtualStack as any)[Symbol.for('dxos.composable')] = true;

//
// InternalPlaceholder
//

const InternalPlaceholder = (props: MosaicPlaceholderProps<number>) => {
  return (
    <MosaicPlaceholder {...props} classNames={styles.placeholder.root}>
      <div
        className={mx(
          'flex h-full bg-base-surface border border-dashed border-separator rounded-xs',
          styles.placeholder.content,
        )}
      />
    </MosaicPlaceholder>
  );
};

InternalPlaceholder.displayName = 'InternalPlaceholder';

//
// Exports
//

export { MosaicStack, MosaicVirtualStack };

export type { MosaicStackTileComponent, MosaicStackProps, MosaicVirtualStackProps };
