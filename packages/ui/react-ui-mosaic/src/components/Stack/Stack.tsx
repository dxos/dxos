//
// Copyright 2026 DXOS.org
//

import { type ReactVirtualizerOptions, useVirtualizer } from '@tanstack/react-virtual';
import React, { type FC, Fragment, type ReactElement, type Ref, forwardRef } from 'react';

import { invariant } from '@dxos/invariant';
import { type Axis, type SlottableClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useVisibleItems } from '../../hooks';
import {
  type GetId,
  MosaicPlaceholder,
  type MosaicPlaceholderProps,
  type MosaicTileProps,
  mosaicStyles,
  useMosaicContainer,
} from '../Mosaic';

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

type MosaicStackProps<TData = any> = SlottableClassName<
  {
    Tile: MosaicStackTileComponent<TData>;
    getId: GetId<TData>;
    role?: string;
    orientation?: Axis;
    items?: TData[];
  } & Pick<MosaicTileProps<TData>, 'draggable' | 'debug'>
>;

/**
 * Linear layout of Mosaic tiles.
 * NOTE: This is a low-level component and should be wrapped by a scrollable container.
 */
const MosaicStackInner = forwardRef<HTMLDivElement, MosaicStackProps>(
  (
    {
      className,
      classNames,
      role = 'list',
      orientation: orientationProp = 'vertical',
      draggable = true,
      items,
      getId,
      Tile,
      debug,
      ...props
    },
    forwardedRef,
  ) => {
    invariant(Tile);
    const { id, orientation = orientationProp, dragging } = useMosaicContainer(MOSAIC_STACK_NAME);
    const visibleItems = useVisibleItems({ id, items, dragging: dragging?.source.data, getId });
    invariant(orientation === 'vertical' || orientation === 'horizontal', `Invalid orientation: ${orientation}`);

    return (
      <div
        {...props}
        role={role}
        className={mx(
          'flex',
          orientation === 'horizontal' && 'bs-full [&>*]:shrink-0',
          orientation === 'vertical' && 'flex-col',
          classNames,
          className,
        )}
        ref={forwardedRef}
      >
        <InternalPlaceholder orientation={orientation} location={0.5} />
        {visibleItems?.map((item, index) => (
          <Fragment key={getId(item)}>
            <Tile id={getId(item)} data={item} location={index + 1} draggable={draggable} debug={debug} />
            <InternalPlaceholder orientation={orientation} location={index + 1.5} />
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
    'estimateSize' | 'getScrollElement' | 'overscan' | 'onChange'
  >;

const MosaicVirtualStackInner = forwardRef<HTMLDivElement, MosaicVirtualStackProps>(
  (
    {
      className,
      classNames,
      role = 'list',
      orientation = 'vertical',
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
    const { id, dragging } = useMosaicContainer(MOSAIC_VIRTUAL_STACK_NAME);
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
          orientation === 'horizontal' && 'bs-full [&>*]:shrink-0',
          orientation === 'vertical' && 'flex-col',
          classNames,
          className,
        )}
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
                ...(orientation === 'vertical'
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
                <InternalPlaceholder orientation={orientation} location={Math.floor(virtualItem.index / 2) + 0.5} />
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

MosaicVirtualStackInner.displayName = MOSAIC_VIRTUAL_STACK_NAME;

const MosaicVirtualStack = MosaicVirtualStackInner as <TData = any>(
  props: MosaicVirtualStackProps<TData> & { ref?: Ref<HTMLDivElement> },
) => ReactElement;

//
// InternalPlaceholder
//

const InternalPlaceholder = (props: MosaicPlaceholderProps<number>) => {
  return (
    <MosaicPlaceholder {...props} classNames={mosaicStyles.placeholder.root}>
      <div
        className={mx(
          'flex bs-full bg-baseSurface border border-dashed border-separator rounded-sm',
          mosaicStyles.placeholder.content,
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
