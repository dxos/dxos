//
// Copyright 2025 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type CSSProperties, type PropsWithChildren, type Ref, forwardRef } from 'react';

import { type SlottableProps, type ThemedClassName } from '@dxos/ui-types';

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
const Column = forwardRef(
  (
    { classNames, className, asChild, role = 'none', children, gutter = '1rem', ...props }: ColumnProps,
    ref: Ref<HTMLDivElement>,
  ) => {
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
        ref={ref}
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

type SegmentProps = ThemedClassName<PropsWithChildren>;

const Segment = ({ classNames, children }: SegmentProps) => {
  const { tx } = useThemeContext();
  return (
    <div role='none' className={tx('container.segment', {}, classNames)}>
      {children}
    </div>
  );
};

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
