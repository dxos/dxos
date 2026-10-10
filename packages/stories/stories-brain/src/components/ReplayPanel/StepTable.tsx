//
// Copyright 2026 DXOS.org
//

import React, { type ComponentPropsWithoutRef, type ReactNode } from 'react';

import { mx } from '@dxos/ui-theme';

export type StepTableProps = Omit<ComponentPropsWithoutRef<'div'>, 'className'> & {
  /** Expected | Actual headings after the label column; omitted for a key/value table. */
  columns?: readonly [string, string];
};

/**
 * A compact bordered table for a step card, on a fixed grid (a 5rem key column, then equal value columns) rather than an
 * auto-sized `<table>`, so its columns line up across every card; react-ui has no table primitive short of the data
 * grid.
 */
export const StepTable = ({ columns, children, ...props }: StepTableProps) => (
  <div
    {...props}
    role='table'
    className={mx(
      'mt-2 grid w-full rounded-sm border border-separator text-sm',
      columns ? 'grid-cols-[5rem_minmax(0,1fr)_minmax(0,1fr)]' : 'grid-cols-[5rem_minmax(0,1fr)]',
    )}
  >
    {columns && (
      <div role='row' className='col-span-full grid grid-cols-subgrid py-0.5 text-fg-muted'>
        <span role='columnheader' />
        {columns.map((column) => (
          <span key={column} role='columnheader' className='min-w-0 truncate px-2'>
            {column}
          </span>
        ))}
      </div>
    )}
    {children}
  </div>
);

export type StepTableRowProps = Omit<ComponentPropsWithoutRef<'div'>, 'className'> & {
  label: ReactNode;
};

/** A row headed by its key, spanning the table's columns; a divider above every row but the table's first. */
export const StepTableRow = ({ label, children, ...props }: StepTableRowProps) => (
  <div
    {...props}
    role='row'
    className='col-span-full grid grid-cols-subgrid border-t border-separator py-0.5 first:border-t-0'
  >
    <span role='rowheader' className='px-2 text-fg-muted'>
      {label}
    </span>
    {children}
  </div>
);

export type StepTableCellProps = Omit<ComponentPropsWithoutRef<'span'>, 'className'> & {
  tone?: 'muted' | 'error';
};

export const StepTableCell = ({ tone, ...props }: StepTableCellProps) => (
  <span
    {...props}
    role='cell'
    className={mx(
      'min-w-0 px-2 break-words',
      tone === 'muted' && 'text-fg-muted',
      tone === 'error' && 'text-error-text',
    )}
  />
);
