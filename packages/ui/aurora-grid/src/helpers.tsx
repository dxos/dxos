//
// Copyright 2023 DXOS.org
//

import { Check, ClipboardText, X } from '@phosphor-icons/react';
import { CellContext, ColumnDef, createColumnHelper, RowData } from '@tanstack/react-table';
import format from 'date-fns/format';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import React from 'react';

import { Tooltip } from '@dxos/aurora';
import { chromeSurface } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/keys';
import { stripUndefinedValues } from '@dxos/util';

import { GridSlots } from './Grid';

// TODO(burdon): Combine?
export const createColumnBuilder = <TData extends RowData>() => ({
  helper: createColumnHelper<TData>(),
  builder: new ColumnBuilder<TData>(),
});

/**
 * NOTE: Can use `meta` for custom properties.
 */
// TODO(burdon): Add accessor options and spread.
type BaseColumnOptions = {
  meta?: any;
  header?: string;
  size?: number;
};

type NumberColumnOptions = BaseColumnOptions & {};

type KeyColumnOptions = BaseColumnOptions & {
  tooltip?: boolean;
};

type DateColumnOptions = BaseColumnOptions & {
  format?: string;
  relative?: boolean;
};

type IconColumnOptions = BaseColumnOptions & {};

/**
 * Util to create column definitions.
 */
// TODO(burdon): Configure styles and base options (e.g., slots for tooltip).
// TODO(burdon): Helper to add classname? Extend def/slot, etc? (e.g., monospace).
export class ColumnBuilder<TData extends RowData> {
  createNumber(options: NumberColumnOptions = {}): Partial<ColumnDef<TData, number>> {
    return stripUndefinedValues({
      size: 100,
      ...options,
      header: (column) => {
        return <div className='text-right'>{options?.header ?? column.header.id}</div>;
      },
      cell: (cell: CellContext<TData, number>) => {
        const value = cell.getValue();
        return <div className='font-mono text-right'>{value?.toLocaleString()}</div>;
      },
    });
  }

  createDate(options: BaseColumnOptions & DateColumnOptions = {}): Partial<ColumnDef<TData, Date>> {
    return stripUndefinedValues({
      ...options,
      size: options?.size ?? 220, // TODO(burdon): Depends on format.
      cell: (cell: CellContext<TData, Date>) => {
        const value = cell.getValue();
        const str = options?.format
          ? format(value, options.format)
          : options?.relative
          ? formatDistanceToNow(value, { addSuffix: true })
          : value.toISOString();
        return <div className='font-mono'>{str}</div>;
      },
    });
  }

  createKey(options: KeyColumnOptions = {}): Partial<ColumnDef<TData, PublicKey>> {
    return stripUndefinedValues({
      ...options,
      size: options?.size ?? 100,
      cell: (cell: CellContext<TData, PublicKey>) => {
        const value = cell.getValue();
        if (!value) {
          return;
        }

        // TODO(burdon): Factor out styles.
        const element = <div className='font-mono font-thin text-green-500'>{value.truncate()}</div>;
        if (!options.tooltip) {
          return element;
        }

        return (
          <div className='group inline-flex gap-2 items-center'>
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>{element}</Tooltip.Trigger>
                <Tooltip.Content side='right'>
                  <Tooltip.Arrow />
                  <ClipboardText
                    onClick={(ev) => {
                      ev.stopPropagation(); // Prevent select row.
                      void navigator.clipboard.writeText(value.toHex());
                    }}
                  />
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
          </div>
        );
      },
    });
  }

  // TODO(burdon): Options.
  createIcon(options: IconColumnOptions = {}): Partial<ColumnDef<TData, boolean>> {
    return stripUndefinedValues({
      ...options,
      size: options?.size ?? 40,
      cell: (cell: CellContext<TData, boolean>) => {
        const value = cell.getValue();
        if (value) {
          return <Check className='text-green-700' />;
        } else if (value === false) {
          return <X className='text-red-700' />;
        } else {
          return null;
        }
      },
    });
  }
}

// TODO(burdon): Integrate with aurora theme (direct dependency -- see aurora-composer, tailwind.ts).
//  See Link.tsx const { tx } = useThemeContext();
//  Reuse button fragments for hoverColors, selected, primary, etc.
// TODO(burdon): Compact mode (smaller than density fine).
export const defaultGridSlots: GridSlots = {
  root: { className: chromeSurface },
  header: { className: [chromeSurface, 'border-b p-1 text-left font-thin opacity-90'] },
  footer: { className: [chromeSurface, 'border-t p-1 text-left font-thin opacity-90'] },
  // cell: { className: 'p-1' },
  row: { className: 'cursor-pointer hover:bg-neutral-50' },
  focus: { className: 'ring-1 ring-teal-500 ring-inset' },
  selected: { className: '!bg-teal-100' },
  margin: { className: 'w-4' },
};
