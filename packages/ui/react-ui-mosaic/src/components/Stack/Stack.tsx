//
// Copyright 2026 DXOS.org
//

import { type ReactVirtualizerOptions, useVirtualizer } from '@tanstack/react-virtual';
import React, { type FC, Fragment, type ReactElement, type Ref, forwardRef } from 'react';

import { invariant } from '@dxos/invariant';
import { type SlottableClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useVisibleItems } from '../../hooks';
import {
  type Axis,
  type GetId,
  Mosaic,
  type MosaicTileProps,
  type MosiacPlaceholderProps,
  useMosaicContainer,
} from '../Mosaic';
import { mosaicStyles } from '../Mosaic';

type StackTileComponent<TData = any> = FC<MosaicTileProps<TData>>;

type StackProps<TData = any> = SlottableClassName<
  {
    Tile: StackTileComponent<TData>;
    getId: GetId<TData>;
    role?: string;
    axis?: Axis;
    items?: TData[];
  } & Pick<MosaicTileProps<TData>, 'draggable' | 'debug'>
>;

/**
 * Linear layout of Mosaic tiles.
 * NOTE: This is a low-level component and should be wrapped by a scrollable container.
 */
const StackInner = forwardRef<HTMLDivElement, StackProps>(
  (
    { className, classNames, role = 'list', axis = 'vertical', draggable = true, items, getId, Tile, debug, ...props },
    forwardedRef,
  ) => {
    invariant(Tile);
    const { id, dragging } = useMosaicContainer(StackInner.displayName!);
    const visibleItems = useVisibleItems({ id, items, dragging: dragging?.source.data, getId });

    return (
      <div
        {...props}
        role={role}
        className={mx(
          'flex',
          axis === 'horizontal' && 'bs-full [&>*]:shrink-0',
          axis === 'vertical' && 'flex-col',
          classNames,
          className,
        )}
        ref={forwardedRef}
      >
        <Placeholder axis={axis} location={0.5} />
        {visibleItems?.map((item, index) => (
          <Fragment key={getId(item)}>
            <Tile id={getId(item)} data={item} location={index + 1} draggable={draggable} debug={debug} />
            <Placeholder axis={axis} location={index + 1.5} />
          </Fragment>
        ))}
      </div>
    );
  },
);

StackInner.displayName = 'Stack';

const Stack = StackInner as <TData = any>(props: StackProps<TData> & { ref?: Ref<HTMLDivElement> }) => ReactElement;

//
// VirtualStack
//

type VirtualStackProps<TData = any> = StackProps<TData> &
  Pick<
    ReactVirtualizerOptions<HTMLElement, HTMLDivElement>,
    'estimateSize' | 'getScrollElement' | 'overscan' | 'onChange'
  >;

const VirtualStackInner = forwardRef<HTMLDivElement, VirtualStackProps>(
  (
    {
      className,
      classNames,
      role = 'list',
      axis = 'vertical',
      items,
      getId,
      Tile,
      estimateSize,
      getScrollElement,
      overscan = 8,
      onChange,
      debug,
      ...props
    },
    forwardedRef,
  ) => {
    invariant(Tile);
    const { id, dragging } = useMosaicContainer(VirtualStackInner.displayName!);
    const visibleItems = useVisibleItems({ id, items, dragging: dragging?.source.data, getId });
    const virtualizer = useVirtualizer({
      count: visibleItems.length * 2 + 1,
      estimateSize,
      getScrollElement,
      overscan,
      onChange,
    });

    const virtualItems = virtualizer.getVirtualItems();

    return (
      <div
        {...props}
        role={role}
        className={mx(
          'flex',
          axis === 'horizontal' && 'bs-full [&>*]:shrink-0',
          axis === 'vertical' && 'flex-col',
          classNames,
          className,
        )}
        style={{
          position: 'relative',
          ...(axis === 'vertical'
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
        {virtualItems.map((virtualItem) => {
          const data = visibleItems![Math.floor(virtualItem.index / 2)];
          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                ...(axis === 'vertical'
                  ? {
                      width: '100%',
                      transform: `translateY(${virtualItem.start}px)`,
                    }
                  : {
                      height: '100%',
                      transform: `translateX(${virtualItem.start}px)`,
                    }),
              }}
              ref={virtualizer.measureElement}
            >
              {virtualItem.index % 2 === 0 ? (
                <Placeholder axis={axis} location={Math.floor(virtualItem.index / 2) + 0.5} />
              ) : (
                <Tile id={getId(data)} data={data} location={Math.floor(virtualItem.index / 2) + 1} debug={debug} />
              )}
            </div>
          );
        })}
      </div>
    );
  },
);

VirtualStackInner.displayName = 'VirtualStackInner';

const VirtualStack = VirtualStackInner as <TData = any>(
  props: VirtualStackProps<TData> & { ref?: Ref<HTMLDivElement> },
) => ReactElement;

//
// Placeholder
//

const Placeholder = (props: MosiacPlaceholderProps<number>) => {
  return (
    <Mosaic.Placeholder {...props} classNames={mosaicStyles.placeholder.root}>
      <div
        className={mx(
          'flex bs-full bg-baseSurface border border-dashed border-separator rounded-sm',
          mosaicStyles.placeholder.content,
        )}
      />
    </Mosaic.Placeholder>
  );
};

Placeholder.displayName = 'Placeholder';

//
// Stack
//

export { Stack, VirtualStack };

export type { StackTileComponent, StackProps, VirtualStackProps };
