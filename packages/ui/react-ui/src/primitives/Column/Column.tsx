//
// Copyright 2025 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type CSSProperties, forwardRef } from 'react';

import { ColumnStyleProps, composableProps } from '@dxos/ui-theme';
import { ThemedClassName, type SlottableProps } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';
import { ScrollArea, ScrollAreaRootProps } from '../../components';

//
// Root
//

const COLUMN_ROOT_NAME = 'Column.Root';

type GutterSize = 'sm' | 'md' | 'lg';

const gutterSizes: Record<GutterSize, string> = {
  sm: 'var(--dx-gutter-sm)',
  md: 'var(--dx-gutter-md)',
  lg: 'var(--dx-gutter-lg)',
};

type ColumnRootProps = ThemedClassName<SlottableProps<HTMLDivElement, { gutter?: GutterSize }>>;

/**
 * Creates a vertical channel with left/right gutter columns.
 * The `--gutter` CSS variable is set for nested components (Dialog, ScrollArea, Form.Viewport, etc.).
 * Use `gutter='sm'` for compact layouts; `gutter='md'` (default) for whitespace layouts (Dialog); `gutter='lg'` for wider spacing.
 * Direct children must use Column.Row (spans all 3 cols) or Column.Viewport (center col only).
 *
 * NOTE: The theme applies a `dx-column` marker class to this element.
 * ScrollArea.Root detects this via `[.dx-column_&]:col-span-full` to span all 3 grid columns,
 * ensuring scroll content extends under the gutters rather than being confined to the center column.
 * The `--gutter` CSS variable is also consumed by ScrollArea's `margin` option to align scrollbar spacing.
 */
const ColumnRoot = forwardRef<HTMLDivElement, ColumnRootProps>(
  ({ children, asChild, role, gutter = 'md', ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;
    const { tx } = useThemeContext();
    const gutterSize = gutterSizes[gutter];
    return (
      <Comp
        {...rest}
        role={role ?? 'none'}
        style={
          {
            '--gutter': gutterSize,
            gridTemplateColumns: [gutterSize, 'minmax(0,1fr)', gutterSize].join(' '),
          } as CSSProperties
        }
        className={tx('column.root', { gutter }, className)}
        ref={forwardedRef}
      >
        {children}
      </Comp>
    );
  },
);

ColumnRoot.displayName = COLUMN_ROOT_NAME;

//
// Row
//

const COLUMN_ROW_NAME = 'Column.Row';

type ColumnRowProps = SlottableProps<HTMLDivElement, ColumnStyleProps>;

/**
 * Spans all 3 columns of the parent Column.Root and uses CSS subgrid to inherit their sizing.
 * Children map to: [col-1: icon/slot] [col-2: content] [col-3: icon/action].
 * Must be a direct child of Column.Root.
 */
const ColumnRow = forwardRef<HTMLDivElement, ColumnRowProps>(
  ({ children, asChild, role, center, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;
    const { tx } = useThemeContext();
    return (
      <Comp {...rest} role={role ?? 'none'} className={tx('column.row', { center }, className)} ref={forwardedRef}>
        {children}
      </Comp>
    );
  },
);

ColumnRow.displayName = COLUMN_ROW_NAME;

//
// Viewport
//

const COLUMN_VIEWPORT_NAME = 'Column.Viewport';

type ColumnViewportProps = SlottableProps<HTMLDivElement, Pick<ScrollAreaRootProps, 'thin'>>;

const ColumnViewport = forwardRef<HTMLDivElement, ColumnViewportProps>(
  ({ children, asChild, role, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { className, ...rest } = composableProps(props);
    return (
      <ScrollArea.Root
        {...rest}
        className={tx('column.viewport', {}, className)}
        orientation='vertical'
        padding
        ref={forwardedRef}
      >
        <ScrollArea.Viewport classNames='py-2'>{children}</ScrollArea.Viewport>
      </ScrollArea.Root>
    );
  },
);

ColumnViewport.displayName = COLUMN_VIEWPORT_NAME;

//
// Column
//

export const Column = {
  Root: ColumnRoot,
  Row: ColumnRow,
  Viewport: ColumnViewport,
};

export type { ColumnRootProps, ColumnRowProps, ColumnViewportProps };
