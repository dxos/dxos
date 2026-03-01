//
// Copyright 2025 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type CSSProperties, type PropsWithChildren, forwardRef } from 'react';

import { type SlottableProps, type ThemedClassName } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';

// TODO(burdon): Integrate with Form, Card, Dialog.
// TODO(burdon): Reconcile AnchoredOverflow.

//
// Main
//

const CONTAINER_MAIN_NAME = 'Container.Main';

type MainProps = ThemedClassName<
  PropsWithChildren<{
    role?: string;
    toolbar?: boolean;
    statusbar?: boolean;
  }>
>;

// TODO(burdon): Custom sizes for toolbars.
const Main = forwardRef<HTMLDivElement, MainProps>(
  ({ classNames, children, role, toolbar, statusbar }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <div
        ref={forwardedRef}
        role={role ?? 'none'}
        style={{
          gridTemplateRows: [toolbar && 'var(--dx-toolbar-size)', '1fr', statusbar && 'var(--dx-statusbar-size)']
            .filter(Boolean)
            .join(' '),
        }}
        className={tx('container.main', { toolbar }, [classNames])}
      >
        {children}
      </div>
    );
  },
);

Main.displayName = CONTAINER_MAIN_NAME;

//
// Column
//

const CONTAINER_COLUMN_NAME = 'Container.Column';

type GutterSize = 'sm' | 'md' | 'lg';

const gutterSizes: Record<GutterSize, string> = {
  sm: 'var(--dx-gutter-sm)',
  md: 'var(--dx-gutter-md)',
  lg: 'var(--dx-gutter-lg)',
};

type ColumnProps = SlottableProps<HTMLDivElement> & { gutter?: GutterSize };

/**
 * Creates a vertical channel with left/right gutter.
 * The `--gutter` CSS variable is used to set the gutter width by nested components, such as:
 * - ScrollArea
 * - Dialog
 * - Form
 * - Card
 */
const Column = forwardRef<HTMLDivElement, ColumnProps>(
  ({ classNames, className, asChild, role = 'none', children, gutter = 'md', ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : Primitive.div;
    const gutterSize = gutterSizes[gutter];
    return (
      <Root
        {...props}
        style={
          {
            '--gutter': gutterSize,
            gridTemplateColumns: [gutterSize, '1fr', gutterSize].join(' '),
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
  Main,
  Column,
  Segment,
};

export type {
  MainProps as ContainerMainProps,
  ColumnProps as ContainerColumnProps,
  SegmentProps as ContainerSegmentProps,
};
