//
// Copyright 2026 DXOS.org
//

import { type ReactVirtualizerOptions, useVirtualizer } from '@tanstack/react-virtual';
import React, { type FC, Fragment, type ReactElement, type Ref, forwardRef, useRef } from 'react';

import { type Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { type SlottableClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useVisibleItems } from '../../hooks';
import { Card } from '../Card';
import { Mosaic, type MosiacPlaceholderProps, useMosaicContainer } from '../Mosaic';

import { styles } from './styles';
import { type Axis } from './types';

type StackProps<T extends Obj.Any = Obj.Any> = SlottableClassName<{
  role?: string;
  axis?: Axis;
  items?: T[];
  Component?: FC<{ object: T; location: number }>;
}>;

/**
 * Linear layout of Mosaic tiles.
 * NOTE: This is a low-level component and should be wrapped by a scrollable container.
 */
const StackInner = forwardRef<HTMLDivElement, StackProps>(
  (
    { className, classNames, role = 'list', axis = 'vertical', items, Component = DefaultComponent, ...props },
    forwardedRef,
  ) => {
    invariant(Component);
    const { id, dragging } = useMosaicContainer(StackInner.displayName!);
    const visibleItems = useVisibleItems({ id, items, dragging: dragging?.source.data });

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
          <Fragment key={item.id}>
            <Component object={item} location={index + 1} />
            <Placeholder axis={axis} location={index + 1.5} />
          </Fragment>
        ))}
      </div>
    );
  },
);

StackInner.displayName = 'Stack';

const Stack = StackInner as <T extends Obj.Any = Obj.Any>(
  props: StackProps<T> & { ref?: Ref<HTMLDivElement> },
) => ReactElement;

//
// VirtualStack
//

type VirtualStackProps<T extends Obj.Any = Obj.Any> = StackProps<T> &
  Pick<ReactVirtualizerOptions<HTMLDivElement, HTMLDivElement>, 'estimateSize'>;

const VirtualStackInner = forwardRef<HTMLDivElement, VirtualStackProps>(
  (
    {
      className,
      classNames,
      role = 'list',
      axis = 'vertical',
      items,
      Component = DefaultComponent,
      estimateSize,
      ...props
    },
    forwardedRef,
  ) => {
    invariant(Component);
    const { id, dragging } = useMosaicContainer(VirtualStackInner.displayName!);
    const visibleItems = useVisibleItems({ id, items, dragging: dragging?.source.data });

    // TODO(burdon): Should reference Mosaic.Viewport; move here or provide ref.
    const viewportRef = useRef<HTMLElement>(null);
    const virtualizer = useVirtualizer({
      getScrollElement: () => viewportRef.current,
      estimateSize,
      count: visibleItems.length * 2 + 1,
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
        {virtualItems.map((virtualItem, index) => (
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
            {index % 2 === 0 ? (
              <Placeholder axis={axis} location={Math.floor(index / 2) + 0.5} />
            ) : (
              <Component object={visibleItems![Math.floor(index / 2)]} location={Math.floor(index / 2) + 1} />
            )}
          </div>
        ))}
      </div>
    );
  },
);

VirtualStackInner.displayName = 'VirtualStackInner';

const VirtualStack = VirtualStackInner as <T extends Obj.Any = Obj.Any>(
  props: VirtualStackProps<T> & { ref?: Ref<HTMLDivElement> },
) => ReactElement;

//
// DefaultComponent
//

const DefaultComponent: StackProps['Component'] = (props) => {
  const dragHandleRef = useRef<HTMLButtonElement>(null);
  return (
    <Mosaic.Tile {...props} className='border border-separator rounded-sm font-mono'>
      <Card.Toolbar>
        <Card.DragHandle ref={dragHandleRef} />
        <Card.Heading> {props.object.id}</Card.Heading>
      </Card.Toolbar>
    </Mosaic.Tile>
  );
};

DefaultComponent.displayName = 'DefaultComponent';

//
// Placeholder
//

const Placeholder = (props: MosiacPlaceholderProps<number>) => {
  return (
    <Mosaic.Placeholder {...props} classNames={styles.placeholder.root}>
      <div
        className={mx(
          'flex bs-full bg-baseSurface border border-dashed border-separator rounded-sm',
          styles.placeholder.content,
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

export type { StackProps, VirtualStackProps };
