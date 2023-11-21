//
// Copyright 2023 DXOS.org
//

import { Check, ClipboardText, type Icon, X } from '@phosphor-icons/react';
import {
  createColumnHelper,
  type ColumnDef,
  type ColumnMeta,
  type RowData,
  type ColumnHelper,
  type CellContext,
} from '@tanstack/react-table';
import format from 'date-fns/format';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import defaultsDeep from 'lodash.defaultsdeep';
import React, { useRef, useState } from 'react';

import { type PublicKey } from '@dxos/keys';
import { type ClassNameValue, Input, Tooltip } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';
import { stripUndefinedValues } from '@dxos/util';

import { CellCombobox } from './components';
import { useTableContext } from './components/Table/TableContext';
import { textPadding } from './theme';

export type ValueUpdater<TData extends RowData, TValue> = (row: TData, id: string, value: TValue) => void;

export const createColumnBuilder = <TData extends RowData>() => ({
  helper: createColumnHelper<TData>(),
  builder: new ColumnBuilder<TData>(),
});

/**
 * NOTE: Can use `meta` for custom properties.
 */
export type BaseColumnOptions<TData, TValue> = Partial<ColumnDef<TData, TValue>> & {
  meta?: ColumnMeta<TData, TValue>;
  label?: string;
  classNames?: ClassNameValue;
  onUpdate?: ValueUpdater<TData, TValue | undefined>;
};

// TODO(burdon): Better abstraction?
export type SearchListQueryModel<TData extends RowData> = {
  getId(object: TData): string;
  getText(object: TData): string;
  query(text?: string): Promise<TData[]>;
};

export type ComboboxColumnOptions<TData extends RowData> = BaseColumnOptions<TData, any> & {
  model: SearchListQueryModel<TData>;
};

export type StringColumnOptions<TData extends RowData> = BaseColumnOptions<TData, string> & {};
export type SelectRowColumnOptions<TData extends RowData> = BaseColumnOptions<TData, string> & {};

export type NumberColumnOptions<TData extends RowData> = BaseColumnOptions<TData, number> & {
  digits?: number;
};

export type KeyColumnOptions<TData extends RowData> = BaseColumnOptions<TData, PublicKey> & {
  tooltip?: boolean;
};

export type DateColumnOptions<TData extends RowData> = BaseColumnOptions<TData, Date> & {
  format?: string;
  relative?: boolean;
};

export type SwitchColumnOptions<TData extends RowData> = BaseColumnOptions<TData, boolean> & {};

export type IconColumnOptions<TData extends RowData> = BaseColumnOptions<TData, boolean> & {
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

const ComboboxBuilderCell = <TData extends RowData>(cellContext: CellContext<TData, TData>) => {
  const { model, onUpdate } = cellContext.column.columnDef.meta as ColumnMeta<TData, TData>;
  return (
    <CellCombobox<TData>
      model={model!}
      value={cellContext.getValue()}
      onValueChange={(value) => onUpdate?.(cellContext.row.original, cellContext.column.id, value)}
    />
  );
};

const StringBuilderCell = <TData extends RowData>(cellContext: CellContext<TData, string>) => {
  const { onUpdate } = cellContext.column.columnDef.meta as ColumnMeta<TData, string>;
  // https://tanstack.com/table/v8/docs/examples/react/editable-data
  const initialValue = cellContext.getValue();
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (value === initialValue) {
      return;
    }
    onUpdate?.(cellContext.row.original, cellContext.column.id, value);
  };

  const handleCancel = () => {
    setValue(initialValue);
  };

  // Check if first input column of last row.
  const rows = cellContext.table.getRowModel().flatRows;
  const columns = cellContext.table.getVisibleFlatColumns();
  const placeholder = cellContext.row.index === rows.length - 1 && columns[0].id === cellContext.column.id;

  // TODO(burdon): Don't render inputs unless mouse over (Show ellipsis when div)?
  return (
    <Input.Root>
      <Input.TextInput
        ref={inputRef}
        variant='subdued'
        placeholder={placeholder ? 'Add row...' : undefined}
        classNames={['is-full', textPadding]}
        value={value ?? ''}
        onBlur={() => handleSave()}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => (event.key === 'Enter' && handleSave()) || (event.key === 'Escape' && handleCancel())}
      />
    </Input.Root>
  );
};

const NumberBuilderCell = <TData extends RowData>(cellContext: CellContext<TData, number>) => {
  const { onUpdate, cell, digits } = cellContext.column.columnDef.meta as ColumnMeta<TData, string>;
  const value = cellContext.getValue();
  const [text, setText] = useState<string>();

  const handleEdit = () => {
    if (onUpdate) {
      setText(value !== undefined ? String(value) : '');
    }
  };

  // TODO(burdon): Property is encoded as float (e.g., 6.1 => 6.099)
  const handleSave = () => {
    const value = text?.trim().length ? Number(text) : NaN;
    onUpdate?.(cellContext.row.original, cellContext.column.id, isNaN(value) ? undefined : value);
    setText(undefined);
  };

  const handleCancel = () => {
    setText(undefined);
  };

  if (text !== undefined) {
    return (
      <Input.Root>
        <Input.TextInput
          value={text}
          classNames={['is-full text-end font-mono']}
          onBlur={handleSave}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => (event.key === 'Escape' && handleCancel()) || (event.key === 'Enter' && handleSave())}
        />
      </Input.Root>
    );
  }

  return (
    <div
      className={mx('is-full text-end font-mono empty:after:content-[" "]', textPadding, cell?.classNames)}
      onClick={handleEdit}
    >
      {value?.toLocaleString(undefined, {
        minimumFractionDigits: digits ?? 0,
        maximumFractionDigits: digits ?? 2,
      })}
    </div>
  );
};

/**
 * Util to create column definitions.
 */
export class ColumnBuilder<TData extends RowData> {
  /**
   * Combobox value
   */
  combobox({
    label,
    classNames,
    model,
    onUpdate,
    ...props
  }: ComboboxColumnOptions<TData>): Partial<ColumnDef<TData, any>> {
    return defaults(props, {
      minSize: 100,
      meta: {
        model,
        onUpdate,
        cell: { classNames },
      },
      header: (column) => {
        return label ?? column.header.id;
      },
      cell:
        model && onUpdate
          ? ComboboxBuilderCell
          : (cellContext) => {
              const cellValue = cellContext.getValue();
              return <div className={mx('truncate', classNames)}>{cellValue ? model?.getText(cellValue) : ''}</div>;
            },
    });
  }

  /**
   * String formats.
   */
  string({ label, classNames, onUpdate, ...props }: StringColumnOptions<TData> = {}): Partial<
    ColumnDef<TData, string>
  > {
    return defaults(props, {
      minSize: 100,
      meta: { onUpdate, cell: { classNames } },
      // TODO(burdon): Default.
      header: (column) => {
        return label ?? column.header.id;
      },
      cell: onUpdate
        ? StringBuilderCell
        : (cell) => {
            const value = cell.getValue();
            return <div className={mx('truncate', textPadding, classNames)}>{value}</div>;
          },
    });
  }

  /**
   * Number formats.
   */
  number({ label, minSize, classNames, digits, onUpdate, ...props }: NumberColumnOptions<TData> = {}): Partial<
    ColumnDef<TData, number>
  > {
    return defaults(props, {
      size: 100,
      minSize: 100,
      meta: { onUpdate, digits, header: { classNames: 'text-end' }, cell: { classNames } },
      header: (cell) => label ?? cell.header.id,
      cell: NumberBuilderCell,
    });
  }

  /**
   * Date formats.
   */
  // TODO(burdon): Date picker (pluggable renderers?)
  date({ label, format: formatSpec, relative, classNames, ...props }: DateColumnOptions<TData> = {}): Partial<
    ColumnDef<TData, Date>
  > {
    return defaults(props, {
      size: 220, // TODO(burdon): Depends on format.
      minSize: 100,
      meta: { cell: { classNames } },
      header: (cell) => label ?? cell.header.id,
      cell: (cell) => {
        const value = cell.getValue();

        try {
          const str = value
            ? formatSpec
              ? format(value, formatSpec)
              : relative
              ? formatDistanceToNow(value, { addSuffix: true })
              : value.toISOString()
            : undefined;

          return <div className={mx(textPadding, classNames)}>{str}</div>;
        } catch (err) {
          console.log(value);
          return null;
        }
      },
    });
  }

  /**
   * PublicKey with tooltip.
   */
  key({ label, tooltip, ...props }: KeyColumnOptions<TData> = {}): Partial<ColumnDef<TData, PublicKey>> {
    return defaults(props, {
      size: 94,
      minSize: 94,
      meta: { cell: { classNames: ['font-mono', textPadding] } },
      header: (cell) => label ?? cell.header.id,
      cell: (cell) => {
        const value = cell.getValue();
        if (!value) {
          return;
        }

        // TODO(burdon): Factor out styles.
        const element = value.truncate();
        if (!tooltip) {
          return element;
        }

        return (
          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger>{element}</Tooltip.Trigger>
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
        );
      },
    });
  }

  /**
   * Row selector
   */
  selectRow({
    label,
    classNames,
    onUpdate,
    id = 'selectRow',
    ...props
  }: SelectRowColumnOptions<TData> = {}): Parameters<ColumnHelper<TData>['display']>[0] {
    return {
      id,
      size: 32,
      minSize: 32,
      maxSize: 32,
      meta: { cell: { classNames } },
      header: ({ table }) => {
        const { rowsSelectable } = useTableContext('HELPER_SELECT_ROW_HEADER_CELL');
        const checked = table.getIsSomeRowsSelected() ? 'indeterminate' : table.getIsAllRowsSelected();
        return rowsSelectable === 'multi' ? (
          <Input.Root>
            <Input.Checkbox
              size={4}
              classNames={['mli-auto', classNames]}
              checked={checked}
              onCheckedChange={() => table.toggleAllRowsSelected()}
            />
          </Input.Root>
        ) : null;
      },
      cell: (cell) => {
        const { row } = cell;
        const checked = row.getCanSelect()
          ? row.getIsSelected()
          : row.getCanSelectSubRows() && (row.getIsSomeSelected() ? 'indeterminate' : row.getIsAllSubRowsSelected());
        return (
          <Input.Root>
            <Input.Checkbox
              size={4}
              classNames={['mli-auto', classNames]}
              checked={checked}
              onCheckedChange={(event) => {
                if (row.getCanSelect()) {
                  row.getToggleSelectedHandler()(event);
                }
              }}
              disabled={!(row.getCanSelect() || row.getCanSelectSubRows())}
            />
          </Input.Root>
        );
      },
    };
  }

  /**
   * Switch
   */
  switch({ label, classNames, onUpdate, ...props }: SwitchColumnOptions<TData> = {}): Partial<
    ColumnDef<TData, boolean>
  > {
    return defaults(props, {
      size: 50,
      minSize: 50,
      meta: { cell: { classNames: [textPadding, classNames] } },
      header: (column) => label ?? column.header.id,
      cell: (cell) => {
        const value = cell.getValue();
        return (
          <Input.Root>
            <Input.Switch
              classNames={['block mli-auto', classNames]}
              onClick={(event) => event.stopPropagation()}
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
  icon({ label, size, on, off, ...props }: IconColumnOptions<TData> = {}): Partial<ColumnDef<TData, boolean>> {
    const IconOn = on?.Icon ?? Check;
    const IconOff = off?.Icon ?? X;
    return defaults(props, {
      size: size ?? 32,
      header: (column) => <div className={'justify-center'}>{label ?? column.header.id}</div>,
      cell: (cell) => {
        const value = cell.getValue();
        if (value) {
          return <IconOn className={mx('block mli-auto', getSize(6), on?.className ?? 'text-green-700')} />;
        } else if (value === false) {
          return <IconOff className={mx('block mli-auto', getSize(6), off?.className ?? 'text-red-700')} />;
        } else {
          return null;
        }
      },
    });
  }
}
