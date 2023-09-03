//
// Copyright 2023 DXOS.org
//

import { Check, ClipboardText, Icon, X } from '@phosphor-icons/react';
import { CellContext, ColumnDef, createColumnHelper, RowData } from '@tanstack/react-table';
import format from 'date-fns/format';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import defaultsDeep from 'lodash.defaultsdeep';
import React, { useState } from 'react';

import { Input, Tooltip } from '@dxos/aurora';
import { chromeSurface, inputSurface, mx } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/keys';
import { stripUndefinedValues } from '@dxos/util';

import { GridColumnDef, GridSlots } from './Grid';

export const createColumnBuilder = <TData extends RowData>() => ({
  helper: createColumnHelper<TData>(),
  builder: new ColumnBuilder<TData>(),
});

// TODO(burdon): Add context.
export type ValueUpdater<TData, TValue> = (cell: CellContext<TData, TValue>, value: TValue) => void;

// export interface GridMeta<TData, TValue> extends ColumnMeta<TData, TValue> {
//   updater?: ValueUpdater<TData, TValue>;
// }

/**
 * NOTE: Can use `meta` for custom properties.
 */
// TODO(burdon): Add accessor options and spread.
type BaseColumnOptions<TData, TValue> = Partial<ColumnDef<TData, TValue>> & {
  // meta?: GridMeta<TData, TValue>;
  header?: string; // TODO(burdon): Collides with ColumdDef (rename label).
  className?: string;
  onUpdate?: ValueUpdater<TData, TValue>;
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

type BooleanColumnOptions<TData extends RowData> = BaseColumnOptions<TData, boolean> & {};

type IconColumnOptions<TData extends RowData> = BaseColumnOptions<TData, boolean> & {
  IconOn?: Icon;
  IconOff?: Icon;
};

const defaults = <TData extends RowData, TValue>(
  options: Partial<ColumnDef<TData, TValue>>,
  ...sources: Partial<ColumnDef<TData, TValue>>[]
): Partial<ColumnDef<TData, TValue>> => {
  return stripUndefinedValues(defaultsDeep({}, options, ...sources));
};

/**
 * Util to create column definitions.
 */
export class ColumnBuilder<TData extends RowData> {
  /**
   * String formats.
   */
  string({ header, className, onUpdate, ...props }: StringColumnOptions<TData> = {}): Partial<
    ColumnDef<TData, string>
  > {
    return defaults(props, {
      header: (column) => {
        return <div className={mx(onUpdate && 'px-2')}>{header ?? column.header.id}</div>;
      },
      cell: onUpdate
        ? (cell) => {
            // https://tanstack.com/table/v8/docs/examples/react/editable-data
            const initialValue = cell.getValue();
            const [value, setValue] = useState(initialValue);
            const handleCancel = () => {
              setValue(initialValue);
            };
            const handleSave = () => {
              onUpdate?.(cell, value);
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
            return <div className={mx('truncate', className)}>{value}</div>;
          },
    });
  }

  /**
   * Number formats.
   */
  number({ size, header, className, ...props }: NumberColumnOptions<TData> = {}): Partial<ColumnDef<TData, number>> {
    return defaults(props, {
      size: size ?? 100,
      header: (column) => {
        return <div className='text-right'>{header ?? column.header.id}</div>;
      },
      cell: (cell) => {
        const value = cell.getValue();
        return <div className={mx('font-mono text-right', className)}>{value?.toLocaleString()}</div>;
      },
    });
  }

  /**
   * Date formats.
   */
  // TODO(burdon): Date picker (pluggable renderers?)
  date({ size, format: formatSpec, relative, className, ...props }: DateColumnOptions<TData> = {}): Partial<
    ColumnDef<TData, Date>
  > {
    return defaults(props, {
      size: size ?? 220, // TODO(burdon): Depends on format.
      cell: (cell) => {
        const value = cell.getValue();
        const str = formatSpec
          ? format(value, formatSpec)
          : relative
          ? formatDistanceToNow(value, { addSuffix: true })
          : value.toISOString();
        return <div className={mx('font-mono', className)}>{str}</div>;
      },
    });
  }

  /**
   * PublicKey with tooltip.
   */
  key({ size, tooltip, ...props }: KeyColumnOptions<TData> = {}): Partial<ColumnDef<TData, PublicKey>> {
    return defaults(props, {
      size: size ?? 100,
      cell: (cell) => {
        const value = cell.getValue();
        if (!value) {
          return;
        }

        // TODO(burdon): Factor out styles.
        const element = <div className='font-mono font-thin text-green-500'>{value.truncate()}</div>;
        if (!tooltip) {
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

  /**
   * Checkbox.
   */
  checkbox({ size, className, onUpdate, ...props }: BooleanColumnOptions<TData> = {}): Partial<
    ColumnDef<TData, boolean>
  > {
    return defaults(props, {
      size: size ?? 32,
      cell: (cell) => {
        const value = cell.getValue();
        return (
          <Input.Root>
            <Input.Checkbox
              onClick={(event) => event.stopPropagation()}
              classNames={className}
              disabled={!onUpdate}
              checked={!!value}
              onCheckedChange={(value) => {
                onUpdate?.(cell, !!value);
              }}
            />
          </Input.Root>
        );
      },
    });
  }

  /**
   * Icon based on boolean value.
   */
  // TODO(burdon): Options to switch icon.
  icon({ size, IconOn = Check, IconOff = X, ...props }: IconColumnOptions<TData> = {}): Partial<
    ColumnDef<TData, boolean>
  > {
    return defaults(props, {
      size: size ?? 32,
      cell: (cell) => {
        const value = cell.getValue();
        if (value) {
          return <IconOn className='text-green-700' />;
        } else if (value === false) {
          return <IconOff className='text-red-700' />;
        } else {
          return null;
        }
      },
    });
  }
}

/**
 * Serializable schema.
 */
export type GridSchema = {
  columns: {
    key: string;
    type: 'number' | 'boolean' | 'string';
    size?: number;
    header?: string;
    editable?: boolean;
  }[];
};

/**
 * Create column definitions from schema metadata.
 */
// TODO(burdon): Specialize for TypedObject and move to plugin-grid.
export const createColumns = <TData extends RowData>(
  schema: GridSchema,
  onUpdate: ValueUpdater<TData, any>,
): GridColumnDef<TData, any>[] => {
  const { helper, builder } = createColumnBuilder<any>();
  return schema.columns.map(({ key, type, ...props }) => {
    switch (type) {
      case 'number':
        return helper.accessor(key, builder.number({ onUpdate, ...props }));
      case 'boolean':
        return helper.accessor(key, builder.checkbox({ onUpdate, ...props }));
      case 'string':
      default:
        return helper.accessor(key, builder.string({ onUpdate, ...props }));
    }
  }) as GridColumnDef<TData, any>[];
};

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
