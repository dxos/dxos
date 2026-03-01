//
// Copyright 2025 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type CSSProperties, type PropsWithChildren, forwardRef, useMemo } from 'react';

import { mx } from '@dxos/ui-theme';
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
    const style = useMemo(
      () => ({
        gridTemplateRows: [toolbar && 'var(--dx-toolbar-size)', '1fr', statusbar && 'var(--dx-statusbar-size)']
          .filter(Boolean)
          .join(' '),
      }),
      [toolbar, statusbar],
    );

    return (
      <div
        ref={forwardedRef}
        role={role ?? 'none'}
        style={style}
        className={mx(
          'h-full w-full grid grid-cols-[100%] overflow-hidden',
          toolbar && [
            '[.dx-main-mobile-layout_&>.dx-toolbar]:px-3 [&>.dx-toolbar]:relative',
            '[&>.dx-toolbar]:border-b [&>.dx-toolbar]:border-subdued-separator',
          ],
          classNames,
        )}
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

type ColumnProps = SlottableProps<HTMLDivElement> & { gutter?: string };

/**
 * Creates a vertical channel with left/right gutter.
 * The `--gutter` CSS variable is used to set the gutter width by nested components, such as:
 * - ScrollArea
 * - Dialog
 * - Form
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
  Main,
  Column,
  Segment,
};

export type {
  MainProps as ContainerMainProps,
  ColumnProps as ContainerColumnProps,
  SegmentProps as ContainerSegmentProps,
};
