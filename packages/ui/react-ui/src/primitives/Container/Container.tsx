//
// Copyright 2025 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type CSSProperties, type PropsWithChildren, forwardRef } from 'react';

import { type SlottableClassName, type SlottableProps } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';

//
// Main
//

const CONTAINER_MAIN_NAME = 'Container.Main';

type MainProps = SlottableClassName<
  PropsWithChildren<{
    role?: string;
    toolbar?: boolean;
    statusbar?: boolean;
  }>
>;

const Main = forwardRef<HTMLDivElement, MainProps>(
  ({ classNames, className, children, role, toolbar, statusbar, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <div
        ref={forwardedRef}
        role={role ?? 'none'}
        {...props}
        style={{
          gridTemplateRows: [toolbar && 'min-content', '1fr', statusbar && 'min-content'].filter(Boolean).join(' '),
        }}
        className={tx('container.main', { toolbar }, [className, classNames])}
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

type GutterSize = 'sm' | 'md' | 'lg' | 'rail';

const gutterSizes: Record<GutterSize, string> = {
  sm: 'var(--dx-gutter-sm)',
  md: 'var(--dx-gutter-md)',
  lg: 'var(--dx-gutter-lg)',
  rail: 'var(--dx-rail-item)',
};

type ColumnProps = SlottableProps<HTMLDivElement> & { gutter?: GutterSize };

/**
 * Creates a vertical channel with left/right gutter columns.
 * The `--gutter` CSS variable is set for nested components (Dialog, ScrollArea, Form.Viewport, etc.).
 * Use `gutter='rail'` for icon-slot row layouts (Card); `gutter='md'` for whitespace layouts (Dialog).
 * Direct children must use Container.Row (spans all 3 cols) or Container.Segment (center col only).
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
            gridTemplateColumns: [gutterSize, 'minmax(0,1fr)', gutterSize].join(' '),
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
// Row
//

const CONTAINER_ROW_NAME = 'Container.Row';

type RowProps = SlottableProps<HTMLDivElement>;

/**
 * Spans all 3 columns of the parent Container.Column and uses CSS subgrid to inherit their sizing.
 * Children map to: [col-1: icon/slot] [col-2: content] [col-3: icon/action].
 * Must be a direct child of Container.Column.
 */
const Row = forwardRef<HTMLDivElement, RowProps>(
  ({ classNames, className, asChild, role = 'none', children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : Primitive.div;
    return (
      <Root {...props} className={tx('container.row', {}, [className, classNames])} role={role} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

Row.displayName = CONTAINER_ROW_NAME;

//
// Segment
//

const CONTAINER_SEGMENT_NAME = 'Container.Segment';

type SegmentProps = SlottableProps<HTMLDivElement>;

/**
 * Occupies only the center column (col-2) of the parent Container.Column grid.
 * Use `asChild` to merge grid positioning onto the child element, eliminating the wrapper div.
 * NOTE: Must not use overflow-hidden here since it will clip input focus rings.
 */
const Segment = forwardRef<HTMLDivElement, SegmentProps>(
  ({ classNames, className, asChild, role = 'none', children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : Primitive.div;

    if (asChild) {
      // With asChild, merge col-start-2 directly onto the child — no contents wrapper needed.
      return (
        <Root
          {...props}
          className={tx('container.segment', {}, [className, classNames])}
          role={role}
          ref={forwardedRef}
        >
          {children}
        </Root>
      );
    }

    return (
      <Root {...props} className={tx('container.segment', {}, [className, classNames])} role={role} ref={forwardedRef}>
        <div className='contents'>{children}</div>
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
  Row,
  Segment,
};

export type {
  MainProps as ContainerMainProps,
  ColumnProps as ContainerColumnProps,
  RowProps as ContainerRowProps,
  SegmentProps as ContainerSegmentProps,
};
