//
// Copyright 2025 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type CSSProperties, type PropsWithChildren, forwardRef } from 'react';

import { type SlottableProps } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';

// TODO(burdon): Replace Form, Container, Card spacing.
// TODO(burdon): Scrolling (reconcile with Mosaic Viewport).
// TODO(burdon): Reconcile AnchoredOverflow.

//
// Root
//

type RootProps = PropsWithChildren;

const Root = ({ children }: RootProps) => {
  return <div>{children}</div>;
};

//
// Column
//

const CONTAINER_COLUMN_NAME = 'Container.Column';

type ColumnProps = SlottableProps<HTMLDivElement> & { gutter?: string };

/**
 * Creates a vertical channel with left/right gutter.
 * The `--gutter` CSS variable is used to set the gutter width by nested components, such as:
 * - ScrollArea
 * - Form
 * - Dialog
 * - Card
 */
const Column = forwardRef<HTMLDivElement, ColumnProps>(
  ({ classNames, className, asChild, role = 'none', children, gutter = '1rem', ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : Primitive.div;
    return (
      <Root
        {...props}
        style={
          {
            '--gutter': gutter,
            gridTemplateColumns: [gutter, '1fr', gutter].join(' '),
          } as CSSProperties
        }
        className={tx('container.column', { gutter }, [className, classNames])}
        role={role}
        ref={forwardedRef}
      >
        {children}
      </Root>
    );
  },
);

Column.displayName = CONTAINER_COLUMN_NAME;

//
// Segment
//

const CONTAINER_SEGMENT_NAME = 'Container.Segment';

type SegmentProps = SlottableProps<HTMLDivElement>;

const Segment = forwardRef<HTMLDivElement, SegmentProps>(
  ({ classNames, className, asChild, role = 'none', children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : Primitive.div;
    return (
      <Root {...props} className={tx('container.segment', {}, [className, classNames])} role={role} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

Segment.displayName = CONTAINER_SEGMENT_NAME;

//
// Container
//

export const Container = {
  Root,
  Column,
  Segment,
};

export type {
  RootProps as ContainerRootProps,
  ColumnProps as ContainerColumnProps,
  SegmentProps as ContainerSegmentProps,
};
