//
// Copyright 2023 DXOS.org
//

import { Check, ClipboardText, Icon, X } from '@phosphor-icons/react';
import { ColumnDef, ColumnMeta, createColumnHelper, RowData } from '@tanstack/react-table';
import format from 'date-fns/format';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import defaultsDeep from 'lodash.defaultsdeep';
import React, { useState } from 'react';

import { Input, Tooltip } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/keys';
import { stripUndefinedValues } from '@dxos/util';

export type ValueUpdater<TData extends RowData, TValue> = (row: TData, id: string, value: TValue) => void;

export const createColumnBuilder = <TData extends RowData>() => ({
  helper: createColumnHelper<TData>(),
  builder: new ColumnBuilder<TData>(),
});

/**
 * NOTE: Can use `meta` for custom properties.
 */
// TODO(burdon): Add accessor options and spread.
type BaseColumnOptions<TData, TValue> = Partial<ColumnDef<TData, TValue>> & {
  meta?: ColumnMeta<TData, TValue>;
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
  on?: {
    Icon?: Icon;
    className?: string;
  };
  off?: {
    Icon?: Icon;
    className?: string;
  };
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
      minSize: 100,
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
              onUpdate?.(cell.row.original, cell.column.id, value);
            };

            // TODO(burdon): Don't render inputs unless mouse over (Show ellipsis when div).
            return (
              <Input.Root>
                <Input.TextInput
                  variant='subdued'
                  classNames={['w-full px-2 border-none bg-transparent focus:bg-white', className]} // TODO(burdon): Color.
                  value={(value as string) ?? ''}
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
  number({ minSize, header, className, ...props }: NumberColumnOptions<TData> = {}): Partial<ColumnDef<TData, number>> {
    return defaults(props, {
      size: 100,
      minSize: 100,
      header: (cell) => <div className='w-full text-right pr-2'>{cell.header.id}</div>,
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
  date({ format: formatSpec, relative, className, ...props }: DateColumnOptions<TData> = {}): Partial<
    ColumnDef<TData, Date>
  > {
    return defaults(props, {
      size: 220, // TODO(burdon): Depends on format.
      minSize: 100,
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
  key({ tooltip, ...props }: KeyColumnOptions<TData> = {}): Partial<ColumnDef<TData, PublicKey>> {
    return defaults(props, {
      size: 100,
      minSize: 100,
      cell: (cell) => {
        const value = cell.getValue();
        if (!value) {
          return;
        }

        // TODO(burdon): Factor out styles.
        const element = (
          <div className='font-mono font-thin text-green-500 dark:text-green-300'>{value.truncate()}</div>
        );
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
  checkbox({ className, onUpdate, ...props }: BooleanColumnOptions<TData> = {}): Partial<ColumnDef<TData, boolean>> {
    return defaults(props, {
      size: 32,
      minSize: 32,
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
                onUpdate?.(cell.row.original, cell.column.id, !!value);
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
  icon({ size, on, off, ...props }: IconColumnOptions<TData> = {}): Partial<ColumnDef<TData, boolean>> {
    const IconOn = on?.Icon ?? Check;
    const IconOff = off?.Icon ?? X;
    return defaults(props, {
      size: size ?? 32,
      cell: (cell) => {
        const value = cell.getValue();
        if (value) {
          return <IconOn className={mx(getSize(6), on?.className ?? 'text-green-700')} />;
        } else if (value === false) {
          return <IconOff className={mx(getSize(6), off?.className ?? 'text-red-700')} />;
        } else {
          return null;
        }
      },
    });
  }
}
