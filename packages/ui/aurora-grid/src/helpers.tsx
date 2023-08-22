//
// Copyright 2023 DXOS.org
//

import { Check, ClipboardText, X } from '@phosphor-icons/react';
import { CellContext, ColumnDef, createColumnHelper, RowData } from '@tanstack/react-table';
import format from 'date-fns/format';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import defaultsDeep from 'lodash.defaultsdeep';
import React from 'react';

import { Tooltip } from '@dxos/aurora';
import { chromeSurface } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/keys';

import { GridColumn, GridSlots } from './Grid';

// TODO(burdon): Combine?
export const createColumnBuilder = <TData extends RowData>() => ({
  helper: createColumnHelper<TData>(),
  builder: new ColumnPropsBuilder<TData>(),
});

// TODO(burdon): Add accessor options and spread.
type BaseColumnOptions = {
  header?: string;
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

// TODO(burdon): Configure styles and base options (e.g., slots for tooltip).
export class ColumnPropsBuilder<TData extends RowData> {
  // TODO(burdon): Helper to add classname? Extend def/slot, etc? (e.g., monospace).

  createNumberCell(options: NumberColumnOptions = {}): Partial<ColumnDef<TData, number>> {
    return {
      size: 80, // TODO(burdon): ???
      header: (column) => {
        return <div className='text-right'>{options?.header ?? column.header.id}</div>;
      },
      cell: (cell: CellContext<TData, number>) => {
        const value = cell.getValue();
        return <div className='font-mono text-right'>{value?.toLocaleString()}</div>;
      },
    };
  }

  // TODO(burdon): Implement header label.
  createDateCell(options: BaseColumnOptions & DateColumnOptions = {}): Partial<ColumnDef<TData, Date>> {
    return {
      size: 160, // TODO(burdon): ???
      header: options?.header,
      cell: (cell: CellContext<TData, Date>) => {
        const value = cell.getValue();
        return options?.format
          ? format(value, options.format)
          : options?.relative
          ? formatDistanceToNow(value, { addSuffix: true })
          : value.toISOString();
      },
    };
  }

  createKeyCell({ tooltip = false }: KeyColumnOptions = {}): Partial<ColumnDef<TData, PublicKey>> {
    return {
      size: 100, // TODO(burdon): ???
      cell: (cell: CellContext<TData, PublicKey>) => {
        const value = cell.getValue();
        if (!value) {
          return;
        }

        // TODO(burdon): Factor out styles.
        const Span = <span className='font-mono font-thin text-green-500'>{value.truncate()}</span>;
        if (!tooltip) {
          return Span;
        }

        return (
          <div className='group inline-flex gap-2 items-center'>
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>{Span}</Tooltip.Trigger>
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
    };
  }

  // TODO(burdon): Options.
  createIconCell(options: IconColumnOptions = {}): Partial<ColumnDef<TData, boolean>> {
    return {
      size: 40,
      header: options?.header,
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
    };
  }
}

// TODO(burdon): Deprecated.

export const createColumn = <TData extends RowData, TValue>(
  id: string,
  ...props: (Partial<GridColumn<TData, TValue>> | undefined)[]
): GridColumn<TData, TValue> => defaultsDeep({ id }, ...props, { header: { label: id } });

export const createTextColumn = <TData extends RowData>(
  id: string,
  props?: Partial<GridColumn<TData, string>>,
): GridColumn<TData, string> => createColumn(id, props);

// TODO(burdon): Formats.
export const DateFormat = {
  DATE: 'MM/dd HH:mm:ss',
  TIME: 'HH:mm:ss',
};

export const createDateColumn = <TData extends RowData>(
  id: string,
  options?: DateColumnOptions, // TODO(burdon): Make optional? Multi method defs?
  props?: Partial<GridColumn<TData, Date>>,
): GridColumn<TData, Date> =>
  createColumn(id, props, {
    width: options?.format ? 140 : options?.relative ? 150 : 180,
    cell: {
      render: ({ value }) =>
        options?.format
          ? format(value, options.format)
          : options?.relative
          ? formatDistanceToNow(value, { addSuffix: true })
          : value.toISOString(),
      className: 'font-mono font-thin text-xs',
    },
  });

export const createNumberColumn = <TData extends RowData>(
  id: string,
  props?: Partial<GridColumn<TData, number>>,
): GridColumn<TData, number> =>
  createColumn(id, props, {
    header: {
      className: 'font-mono text-right',
    },
    cell: {
      render: ({ value }) => value?.toLocaleString(),
      className: 'font-mono text-right',
    },
  });

// TODO(burdon): Make tooltip optional for all columns?
export const createKeyColumn = <TData extends RowData>(
  id: string,
  props?: Partial<GridColumn<TData, PublicKey>>,
): GridColumn<TData, PublicKey> =>
  createColumn(id, props, {
    width: 86,
    cell: {
      render: ({ value }) => {
        if (!value) {
          return null;
        }

        return (
          <div className='group inline-flex gap-2 items-center'>
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  {/* TODO(burdon): Factor out styles. */}
                  <span className='font-mono font-thin text-green-500'>{value.truncate()}</span>
                </Tooltip.Trigger>
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
    },
  });

// TODO(burdon): Option for icons.
export const createBooleanColumn = <TData extends RowData>(
  id: string,
  props?: Partial<GridColumn<TData, boolean>>,
): GridColumn<TData, boolean> =>
  createColumn(id, props, {
    width: 24,
    cell: {
      render: ({ value }) =>
        value ? <Check className='text-green-700' /> : !value ? <X className='text-red-700' /> : null,
    },
  });

// TODO(burdon): Move to theme? Compact mode (small font).
// TODO(burdon): See Link.tsx const { tx } = useThemeContext();
// TODO(burdon): Use aurora-theme directly (see aurora-composer).
// TODO(burdon): Reuse button fragments for hoverColors, selected, primary, etc.
// TODO(burdon): See tailwind.ts
export const defaultGridSlots: GridSlots = {
  root: { className: chromeSurface },
  header: { className: [chromeSurface, 'border-b p-1 text-left font-thin opacity-90'] },
  footer: { className: [chromeSurface, 'border-t p-1 text-left font-thin opacity-90'] },
  cell: { className: 'p-1' },
  row: { className: 'cursor-pointer hover:bg-neutral-50' },
  focus: { className: 'ring-1 ring-teal-500 ring-inset' },
  selected: { className: '!bg-teal-100' },
  margin: { style: { width: 8 } },
};
