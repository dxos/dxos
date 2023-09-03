//
// Copyright 2023 DXOS.org
//

import { Check, ClipboardText, X } from '@phosphor-icons/react';
import { ColumnDef, ColumnMeta, createColumnHelper, RowData } from '@tanstack/react-table';
import format from 'date-fns/format';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import React, { useState } from 'react';

import { Input, Tooltip } from '@dxos/aurora';
import { chromeSurface, inputSurface, mx } from '@dxos/aurora-theme';
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
type BaseColumnOptions<TData, TValue, TMeta = ColumnMeta<TData, TValue>> = Partial<ColumnDef<TData, TValue>> & {
  meta?: TMeta;
  className?: string;
  editable?: boolean; // TODO(burdon): Add accessor.
  header?: string;
};

type StringColumnOptions<TData extends RowData> = BaseColumnOptions<TData, string> & {};

type NumberColumnOptions<TData extends RowData> = BaseColumnOptions<TData, number> & {};

type KeyColumnOptions<TData extends RowData> = BaseColumnOptions<TData, PublicKey> & {
  tooltip?: boolean;
};

type DateColumnOptions<TData extends RowData> = BaseColumnOptions<TData, Date> & {
  format?: string;
  relative?: boolean;
};

type IconColumnOptions<TData extends RowData> = BaseColumnOptions<TData, boolean> & {};

/**
 * Util to create column definitions.
 */
// TODO(burdon): Configure styles and base options (e.g., slots for tooltip). Compact mode.
// TODO(burdon): Helper to add classname? Extend def/slot, etc? (e.g., monospace).
export class ColumnBuilder<TData extends RowData> {
  string(options: StringColumnOptions<TData> = {}): Partial<ColumnDef<TData, string>> {
    return stripUndefinedValues({
      header: (column) => {
        return <div className={mx(options.editable && 'px-2')}>{options?.header ?? column.header.id}</div>;
      },
      cell: options.editable
        ? (cell) => {
            // https://tanstack.com/table/v8/docs/examples/react/editable-data
            const initialValue = cell.getValue();
            const [value, setValue] = useState(initialValue);
            const handleCancel = () => {
              setValue(initialValue);
            };
            const handleSave = () => {
              console.log('update', { value });
            };

            // TODO(burdon): Don't render inputs unless mouse over (Show ellipsis when div).
            return (
              <Input.Root>
                <Input.TextInput
                  variant='subdued'
                  classNames='w-full px-2 border-none bg-transparent focus:bg-white' // TODO(burdon): Color.
                  value={value as string}
                  // TODO(burdon): Stop propagation if already selected to avoid toggling.
                  // onClick={(event) => event.stopPropagation()}
                  onChange={(event) => setValue(event.target.value)}
                  onKeyDown={(event) =>
                    (event.key === 'Enter' && handleSave()) || (event.key === 'Escape' && handleCancel())
                  }
                  onBlur={handleSave}
                />
              </Input.Root>
            );
          }
        : (cell) => {
            const value = cell.getValue();
            return <div className={options.className}>{value}</div>;
          },
      ...options,
    });
  }

  number(options: NumberColumnOptions<TData> = {}): Partial<ColumnDef<TData, number>> {
    return stripUndefinedValues({
      size: 100,
      header: (column) => {
        return <div className='text-right'>{options?.header ?? column.header.id}</div>;
      },
      cell: (cell) => {
        const value = cell.getValue();
        return <div className={mx('font-mono text-right', options.className)}>{value?.toLocaleString()}</div>;
      },
      ...options,
    });
  }

  // TODO(burdon): Date picker (pluggable renderers?)
  date(options: DateColumnOptions<TData> = {}): Partial<ColumnDef<TData, Date>> {
    return stripUndefinedValues({
      size: options?.size ?? 220, // TODO(burdon): Depends on format.
      cell: (cell) => {
        const value = cell.getValue();
        const str = options?.format
          ? format(value, options.format)
          : options?.relative
          ? formatDistanceToNow(value, { addSuffix: true })
          : value.toISOString();
        return <div className={mx('font-mono', options.className)}>{str}</div>;
      },
      ...options,
    });
  }

  key(options: KeyColumnOptions<TData> = {}): Partial<ColumnDef<TData, PublicKey>> {
    return stripUndefinedValues({
      size: options?.size ?? 100,
      cell: (cell) => {
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
      ...options,
    });
  }

  checkbox(options: IconColumnOptions<TData> = {}): Partial<ColumnDef<TData, boolean>> {
    return stripUndefinedValues({
      size: options?.size ?? 32,
      cell: (cell) => {
        const value = cell.getValue();
        return (
          <Input.Root>
            <Input.Checkbox
              disabled={!options.editable}
              checked={!!value}
              onCheckedChange={(value) => {
                console.log('update', { value });
              }}
            />
          </Input.Root>
        );
      },
      ...options,
    });
  }

  // TODO(burdon): Options.
  icon(options: IconColumnOptions<TData> = {}): Partial<ColumnDef<TData, boolean>> {
    return stripUndefinedValues({
      size: options?.size ?? 32,
      cell: (cell) => {
        const value = cell.getValue();
        if (value) {
          return <Check className='text-green-700' />;
        } else if (value === false) {
          return <X className='text-red-700' />;
        } else {
          return null;
        }
      },
      ...options,
    });
  }
}

// TODO(burdon): Integrate with aurora theme (direct dependency -- see aurora-composer, tailwind.ts).
//  See Link.tsx const { tx } = useThemeContext();
//  Reuse button fragments for hoverColors, selected, primary, etc.
// TODO(burdon): Compact mode (smaller than density fine).
export const defaultGridSlots: GridSlots = {
  root: { className: inputSurface },
  header: { className: [chromeSurface, 'border-b p-1 text-left font-thin opacity-90'] },
  footer: { className: [chromeSurface, 'border-t p-1 text-left font-thin opacity-90'] },
  cell: { className: 'pr-2' },
  row: { className: 'cursor-pointer hover:bg-neutral-50' },
  focus: { className: 'ring-1 ring-teal-500 ring-inset' },
  selected: { className: '!bg-teal-100' },
  margin: { className: 'w-4' },
};
