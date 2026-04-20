//
// Copyright 2025 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type CSSProperties } from 'react';

import { type ColumnStyleProps, composableProps, slottable } from '@dxos/ui-theme';
import { type SlottableProps } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';

//
// Root
//

const COLUMN_ROOT_NAME = 'Column.Root';

type GutterSize = 'xs' | 'sm' | 'md' | 'lg';

const gutterSizes: Record<GutterSize, string> = {
  xs: 'var(--dx-gutter-xs)',
  sm: 'var(--dx-gutter-sm)',
  md: 'var(--dx-gutter-md)',
  lg: 'var(--dx-gutter-lg)',
};

type ColumnRootProps = { gutter?: GutterSize };

/**
 * Creates a 3-column CSS grid with left/right gutter columns and a center content column.
 * Sets the `--gutter` CSS variable for nested components.
 *
 * Direct children participate in the grid in one of several ways:
 * - **Column.Center** — places element in the center column (col 2). Preferred for plain content.
 * - **Column.Bleed** — spans all 3 columns gutter-to-gutter. Preferred for `ScrollArea` and
 *   other content that should ignore the gutters.
 * - **Column.Row** — 3-col subgrid row (icons in gutters, content in center).
 *
 * Gutter sizes: `'sm'` for compact layouts (Dialog); `'md'` (default); `'lg'` for wider spacing.
 */
const ColumnRoot = slottable<HTMLDivElement, ColumnRootProps>(
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

type ColumnRowProps = ColumnStyleProps;

/**
 * Spans all 3 columns of the parent Column.Root and uses CSS subgrid to inherit their sizing.
 * Children map to: [col-1: icon/slot] [col-2: content] [col-3: icon/action].
 * Must be a direct child of Column.Root.
 */
const ColumnRow = slottable<HTMLDivElement, ColumnRowProps>(
  ({ children, asChild, role, fullWidth, center, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;
    const { tx } = useThemeContext();
    return (
      <Comp
        {...rest}
        role={role ?? 'none'}
        className={tx('column.row', { fullWidth, center }, className)}
        ref={forwardedRef}
      >
        {children}
      </Comp>
    );
  },
);

ColumnRow.displayName = COLUMN_ROW_NAME;

//
// Bleed
//

const COLUMN_BLEED_NAME = 'Column.Bleed';

type ColumnBleedProps = SlottableProps;

/**
 * Spans all 3 columns of the parent Column.Root (gutter-to-gutter).
 * Use for `ScrollArea`, full-width dividers, tables, or any content that should ignore the gutters.
 */
const ColumnBleed = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  const { className, ...rest } = composableProps(props);
  const Comp = asChild ? Slot : Primitive.div;
  return (
    <Comp {...rest} className={tx('column.bleed', {}, className)} ref={forwardedRef}>
      {children}
    </Comp>
  );
});

ColumnBleed.displayName = COLUMN_BLEED_NAME;

//
// Center
//

const COLUMN_CENTER_NAME = 'Column.Center';

type ColumnCenterProps = SlottableProps;

/**
 * Places its element in column 2 (the center track between gutters) of the parent Column.Root.
 * Does NOT use subgrid — placement is explicit on this element only, so it is safe to nest
 * arbitrary compound components (including ones that render `display: contents` wrappers).
 */
const ColumnCenter = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  const { className, ...rest } = composableProps(props);
  const Comp = asChild ? Slot : Primitive.div;
  return (
    <Comp {...rest} className={tx('column.center', {}, className)} ref={forwardedRef}>
      {children}
    </Comp>
  );
});

ColumnCenter.displayName = COLUMN_CENTER_NAME;

//
// Column
//

export const Column = {
  Root: ColumnRoot,
  Row: ColumnRow,
  Bleed: ColumnBleed,
  Center: ColumnCenter,
};

export type { ColumnRootProps, ColumnRowProps, ColumnBleedProps, ColumnCenterProps };
