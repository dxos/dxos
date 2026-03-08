//
// Copyright 2025 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type CSSProperties, forwardRef } from 'react';

import { type SlottableProps } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';

//
// Root
//

const COLUMN_ROOT_NAME = 'Column.Root';

type GutterSize = 'sm' | 'md' | 'lg' | 'rail';

const gutterSizes: Record<GutterSize, string> = {
  sm: 'var(--dx-gutter-sm)',
  md: 'var(--dx-gutter-md)',
  lg: 'var(--dx-gutter-lg)',
  rail: 'var(--dx-rail-item)',
};

type ColumnRootProps = SlottableProps<HTMLDivElement> & { gutter?: GutterSize };

/**
 * Creates a vertical channel with left/right gutter columns.
 * The `--gutter` CSS variable is set for nested components (Dialog, ScrollArea, Form.Viewport, etc.).
 * Use `gutter='rail'` for icon-slot row layouts (Card); `gutter='md'` for whitespace layouts (Dialog).
 * Direct children must use Column.Row (spans all 3 cols) or Column.Segment (center col only).
 *
 * NOTE: The theme applies a `dx-column` marker class to this element.
 * ScrollArea.Root detects this via `[.dx-column_&]:col-span-full` to span all 3 grid columns,
 * ensuring scroll content extends under the gutters rather than being confined to the center column.
 * The `--gutter` CSS variable is also consumed by ScrollArea's `margin` option to align scrollbar spacing.
 */
const Root = forwardRef<HTMLDivElement, ColumnRootProps>(
  ({ classNames, className, asChild, role, children, gutter = 'md', ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Component = asChild ? Slot : Primitive.div;
    const gutterSize = gutterSizes[gutter];
    return (
      <Component
        {...props}
        role={role ?? 'none'}
        style={
          {
            '--gutter': gutterSize,
            'gridTemplateColumns': [gutterSize, 'minmax(0,1fr)', gutterSize].join(' '),
          } as CSSProperties
        }
        className={tx('column.root', { gutter }, [className, classNames])}
        ref={forwardedRef}
      >
        {children}
      </Component>
    );
  },
);

Root.displayName = COLUMN_ROOT_NAME;

//
// Row
//

const COLUMN_ROW_NAME = 'Column.Row';

type ColumnRowProps = SlottableProps<HTMLDivElement>;

/**
 * Spans all 3 columns of the parent Column.Root and uses CSS subgrid to inherit their sizing.
 * Children map to: [col-1: icon/slot] [col-2: content] [col-3: icon/action].
 * Must be a direct child of Column.Root.
 */
const Row = forwardRef<HTMLDivElement, ColumnRowProps>(
  ({ classNames, className, asChild, role, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Component = asChild ? Slot : Primitive.div;
    return (
      <Component
        {...props}
        className={tx('column.row', {}, [className, classNames])}
        role={role ?? 'none'}
        ref={forwardedRef}
      >
        {children}
      </Component>
    );
  },
);

Row.displayName = COLUMN_ROW_NAME;

//
// Segment
//

const COLUMN_SEGMENT_NAME = 'Column.Segment';

type ColumnSegmentProps = SlottableProps<HTMLDivElement>;

/**
 * Occupies only the center column (col-2) of the parent Column.Root grid.
 * Use `asChild` to merge grid positioning onto the child element, eliminating the wrapper div.
 * NOTE: Must not use overflow-hidden here since it will clip input focus rings.
 */
const Segment = forwardRef<HTMLDivElement, ColumnSegmentProps>(
  ({ classNames, className, asChild, role, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Component = asChild ? Slot : Primitive.div;

    if (asChild) {
      // With asChild, merge col-start-2 directly onto the child — no contents wrapper needed.
      return (
        <Component
          {...props}
          role={role ?? 'none'}
          className={tx('column.segment', {}, [className, classNames])}
          ref={forwardedRef}
        >
          {children}
        </Component>
      );
    }

    return (
      <Component
        {...props}
        className={tx('column.segment', {}, [className, classNames])}
        role={role}
        ref={forwardedRef}
      >
        <div className='contents'>{children}</div>
      </Component>
    );
  },
);

Segment.displayName = COLUMN_SEGMENT_NAME;

//
// Column
//

export const Column = {
  Root,
  Row,
  Segment,
};

export type { ColumnRootProps, ColumnRowProps, ColumnSegmentProps };
