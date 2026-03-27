//
// Copyright 2025 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type CSSProperties } from 'react';

import { type ColumnStyleProps, composableProps, slottable } from '@dxos/ui-theme';
import { type SlottableProps } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';
import { ScrollArea, type ScrollAreaRootProps } from '../../components';

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

type ColumnRootProps = SlottableProps<{ gutter?: GutterSize }>;

/**
 * Creates a 3-column CSS grid with left/right gutter columns and a center content column.
 * Sets the `--gutter` CSS variable for nested components.
 *
 * Direct children participate in the grid in one of three ways:
 * - **Column.Row** — 3-col subgrid row (icons in gutters, content in center).
 * - **Column.Content** — spans full width; re-applies gutters as `px-[var(--gutter)]` padding.
 *   Sets `--gutter-offset` so nested ScrollAreas can break out of the padding.
 * - **Column.Viewport** — spans full width; delegates gutters to ScrollArea.
 *
 * Gutter sizes: `'sm'` for compact layouts (Dialog); `'md'` (default); `'lg'` for wider spacing.
 */
const ColumnRoot = slottable<HTMLDivElement, { gutter?: GutterSize }>(
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

type ColumnRowProps = SlottableProps<ColumnStyleProps>;

/**
 * Spans all 3 columns of the parent Column.Root and uses CSS subgrid to inherit their sizing.
 * Children map to: [col-1: icon/slot] [col-2: content] [col-3: icon/action].
 * Must be a direct child of Column.Root.
 */
const ColumnRow = slottable<HTMLDivElement, ColumnStyleProps>(
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
// Content
//

const COLUMN_CONTENT_NAME = 'Column.Content';

type ColumnContentProps = SlottableProps;

/**
 * Full-width content area that inherits Column.Root's 3-column grid via CSS subgrid.
 * Non-scrolling children default to the center column (between gutters).
 * ScrollArea children span all 3 columns via `[.dx-column_&]:col-span-full`.
 */
const ColumnContent = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  const { className, ...rest } = composableProps(props, { role: 'none' });
  const Comp = asChild ? Slot : Primitive.div;
  return (
    <Comp {...rest} className={tx('column.content', {}, className)} ref={forwardedRef}>
      {children}
    </Comp>
  );
});

ColumnContent.displayName = COLUMN_CONTENT_NAME;

//
// Viewport
//

const COLUMN_VIEWPORT_NAME = 'Column.Viewport';

type ColumnViewportProps = SlottableProps<Pick<ScrollAreaRootProps, 'thin'>>;

const ColumnViewport = slottable<HTMLDivElement, Pick<ScrollAreaRootProps, 'thin'>>(
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
        <ScrollArea.Viewport>{children}</ScrollArea.Viewport>
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
  Content: ColumnContent,
  Viewport: ColumnViewport,
  Row: ColumnRow,
};

export type { ColumnRootProps, ColumnContentProps, ColumnViewportProps, ColumnRowProps };
