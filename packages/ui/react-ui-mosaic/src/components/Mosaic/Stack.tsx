//
// Copyright 2026 DXOS.org
//

import React, { type FC, Fragment, type ReactElement, type Ref, forwardRef } from 'react';

import { type Obj } from '@dxos/echo';
import { type SlottableClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useVisibleItems } from '../../hooks';
import { Mosaic, type MosiacPlaceholderProps, useMosaicContainer } from '../Mosaic';

import { styles } from './styles';
import { type Axis } from './types';

// TODO(burdon): Move into Mosaic.tsx.

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
    const { id, dragging } = useMosaicContainer(StackInner.displayName!);
    const visibleItems = useVisibleItems({ id, items, dragging: dragging?.source.data });

    return (
      <div
        {...props}
        role={role}
        className={mx('flex', axis === 'vertical' && 'flex-col', classNames, className)}
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

const DefaultComponent: FC<{ object: Obj.Any; location: number }> = ({ object }) => <div role='none'>{object.id}</div>;

const Stack = StackInner as <T extends Obj.Any = Obj.Any>(
  props: StackProps<T> & { ref?: Ref<HTMLDivElement> },
) => ReactElement;

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

export { Stack };

export type { StackProps };
