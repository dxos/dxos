//
// Copyright 2023 DXOS.org
//

import { useFocusFinders } from '@fluentui/react-tabster';
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
import React, { useEffect, useRef, useState } from 'react';

import { type PublicKey } from '@dxos/keys';
import { type ClassNameValue, Input, Tooltip } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { CellCombobox } from './components';
import { useTableContext } from './components/Table/TableContext';
import { textPadding } from './theme';

export type ValueUpdater<TData extends RowData, TValue> = (row: TData, id: string, value: TValue) => void;

export const createColumnBuilder = <TData extends RowData>() => ({
  helper: createColumnHelper<TData>(),
  builder: new ColumnBuilder<TData>(),
});

// TODO(thure): This interface is redundant, e.g. `classNames` == `meta.cell.classNames`
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

const ComboboxBuilderCell = <TData extends RowData>(cellContext: CellContext<TData, TData>) => {
  const { model, onUpdate } = cellContext.column.columnDef.meta as ColumnMeta<TData, TData>;
  return model ? (
    <CellCombobox<TData>
      model={model}
      value={cellContext.getValue()}
      onValueChange={(value) => onUpdate?.(cellContext.row.original, cellContext.column.id, value)}
    />
  ) : null;
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

const parseNumber = (text?: string) => (text?.trim().length ? Number(text) : NaN);

const displayNumber = (value?: number, digits?: number) =>
  value || value === 0
    ? value.toLocaleString(undefined, {
        minimumFractionDigits: digits ?? 0,
        maximumFractionDigits: digits ?? 2,
      })
    : '';

const NumberBuilderCell = <TData extends RowData>(cellContext: CellContext<TData, number>) => {
  const { onUpdate, digits } = cellContext.column.columnDef.meta as ColumnMeta<TData, string>;
  const value = cellContext.getValue();
  const [text, setText] = useState<string>(displayNumber(value, digits));
  const { findPrevFocusable } = useFocusFinders();
  const ref = useRef<HTMLInputElement | null>(null);

  // Update display value if `digits` changes and input is not in focus.
  useEffect(() => {
    (!document.activeElement || document.activeElement !== ref.current) && setText(displayNumber(value, digits));
  }, [digits, value]);

  const handleEdit = () => {
    if (onUpdate) {
      setText(value !== undefined ? String(value) : '');
    }
  };

  // TODO(burdon): Property is encoded as float (e.g., 6.1 => 6.099)
  const handleSave = () => {
    const nextValue = parseNumber(text);
    onUpdate?.(cellContext.row.original, cellContext.column.id, isNaN(nextValue) ? undefined : nextValue);
    setText(displayNumber(nextValue, digits));
    // Shift focus only if input is focused on save (e.g. on `Enter`).
    ref.current && document.activeElement === ref.current && findPrevFocusable(ref.current)?.focus();
  };

  const _handleCancel = () => {
    setText(displayNumber(value, digits));
    ref.current && findPrevFocusable(ref.current)?.focus();
  };

  return (
    <Input.Root>
      <Input.TextInput
        ref={ref}
        variant='subdued'
        value={text}
        classNames={['is-full text-end font-mono', textPadding]}
        onBlur={handleSave}
        onFocus={handleEdit}
        onChange={({ target: { value } }) => setText(value)}
        onKeyDown={(event) => {
          // TODO(thure): `Escape` is reserved for blurring the input and moving focus to the cell
          return /* (event.key === 'Escape' && handleCancel()) || */ event.key === 'Enter' && handleSave();
        }}
      />
    </Input.Root>
  );
};

const RowSelectorBuilderCell = <TData extends RowData>(cellContext: CellContext<TData, unknown>) => {
  const { cell } = cellContext.column.columnDef.meta as ColumnMeta<TData, unknown>;
  const { row } = cellContext;

  const checked = row.getCanSelect()
    ? row.getIsSelected()
    : row.getCanSelectSubRows() && (row.getIsSomeSelected() ? 'indeterminate' : row.getIsAllSubRowsSelected());
  return (
    <Input.Root>
      <Input.Checkbox
        size={4}
        classNames={['mli-auto', cell?.classNames]}
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
};

const SwitchBuilderCell = <TData extends RowData>(cellContext: CellContext<TData, boolean>) => {
  const { onUpdate } = cellContext.column.columnDef.meta as ColumnMeta<TData, boolean>;
  const value = cellContext.getValue();
  return (
    <Input.Root>
      <Input.Switch
        classNames='block mli-auto'
        onClick={(event) => event.stopPropagation()}
        disabled={!onUpdate}
        checked={!!value}
        onCheckedChange={(value) => {
          onUpdate?.(cellContext.row.original, cellContext.column.id, !!value);
        }}
      />
    </Input.Root>
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
    return {
      minSize: 100,
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
      ...props,
      meta: {
        ...props.meta,
        model,
        onUpdate,
        cell: { classNames, ...props.meta?.cell },
      },
    };
  }

  /**
   * String formats.
   */
  string({ label, classNames, onUpdate, ...props }: StringColumnOptions<TData> = {}): Partial<
    ColumnDef<TData, string>
  > {
    return {
      minSize: 100,
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
      ...props,
      meta: {
        ...props.meta,
        onUpdate,
        cell: { ...props.meta?.cell, classNames },
      },
    };
  }

  /**
   * Number formats.
   */
  number({ label, minSize, classNames, digits, onUpdate, ...props }: NumberColumnOptions<TData> = {}): Partial<
    ColumnDef<TData, number>
  > {
    return {
      size: 100,
      minSize: 100,
      header: (cell) => label ?? cell.header.id,
      cell: NumberBuilderCell,
      ...props,
      meta: {
        ...props.meta,
        onUpdate,
        digits,
        header: { classNames: 'text-end', ...props.meta?.header },
        cell: { ...props.meta?.cell, classNames },
      },
    };
  }

  /**
   * Date formats.
   */
  // TODO(burdon): Date picker (pluggable renderers?)
  date({ label, format: formatSpec, relative, classNames, ...props }: DateColumnOptions<TData> = {}): Partial<
    ColumnDef<TData, Date>
  > {
    return {
      size: 220, // TODO(burdon): Depends on format.
      minSize: 100,
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
      ...props,
      meta: { ...props.meta, cell: { ...props.meta?.cell, classNames } },
    };
  }

  /**
   * PublicKey with tooltip.
   */
  key({ label, tooltip, classNames, ...props }: KeyColumnOptions<TData> = {}): Partial<ColumnDef<TData, PublicKey>> {
    return {
      size: 94,
      minSize: 94,
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
              <Tooltip.Portal>
                <Tooltip.Content side='right'>
                  <Tooltip.Arrow />
                  <ClipboardText
                    onClick={(ev) => {
                      ev.stopPropagation(); // Prevent select row.
                      void navigator.clipboard.writeText(value.toHex());
                    }}
                  />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        );
      },
      ...props,
      meta: { ...props.meta, cell: { ...props.meta?.cell, classNames: ['font-mono', textPadding, classNames] } },
    };
  }

  /**
   * Row selector
   */
  selectRow({ classNames, onUpdate, id = 'selectRow' }: SelectRowColumnOptions<TData> = {}): Parameters<
    ColumnHelper<TData>['display']
  >[0] {
    return {
      id,
      size: 32,
      minSize: 32,
      maxSize: 32,
      meta: { onUpdate, cell: { classNames } },
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
      cell: RowSelectorBuilderCell,
    };
  }

  /**
   * Switch
   */
  switch({ label, classNames, onUpdate, ...props }: SwitchColumnOptions<TData> = {}): Partial<
    ColumnDef<TData, boolean>
  > {
    return {
      size: 50,
      minSize: 50,
      header: (column) => label ?? column.header.id,
      cell: SwitchBuilderCell,
      ...props,
      meta: { ...props.meta, onUpdate, cell: { ...props.meta?.cell, classNames: [textPadding, classNames] } },
    };
  }

  /**
   * Icon based on boolean value.
   */
  icon({ label, size, on, off, ...props }: IconColumnOptions<TData> = {}): Partial<ColumnDef<TData, boolean>> {
    const IconOn = on?.Icon ?? Check;
    const IconOff = off?.Icon ?? X;
    return {
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
      ...props,
    };
  }
}
