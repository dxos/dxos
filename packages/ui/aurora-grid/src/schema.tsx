//
// Copyright 2023 DXOS.org
//

import { Check, CaretDown, Plus, Trash, X } from '@phosphor-icons/react';
import { ColumnDef, RowData } from '@tanstack/react-table';
import React, { useState } from 'react';

import { Button, Input, Popover, Select, Toolbar } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/keys';
import { safeParseInt, stripUndefinedValues } from '@dxos/util';

import { BaseColumnOptions, createColumnBuilder } from './helpers';

/**
 * Serializable schema.
 */
export type GridSchema = {
  columns: GridSchemaColumn[];
};

export type GridSchemaColumn = {
  id: string;
  type: 'number' | 'boolean' | 'date' | 'string';
  size?: number;
  label?: string;
  digits?: number;

  // TODO(burdon): Move to meta.
  fixed?: boolean;
  editable?: boolean;
  resize?: boolean;
};

// TODO(burdon): Create builder.

type CreateColumnsOptions<TData extends RowData, TValue> = {
  onUpdate?: (row: TData, id: string, value: TValue) => void;
  onColumnUpdate?: (id: string, column: GridSchemaColumn) => void;
  onColumnDelete?: (id: string) => void;
};

/**
 * Create column definitions from schema metadata.
 */
export const createColumns = <TData extends RowData>(
  schema: GridSchema,
  { onUpdate, onColumnUpdate, onColumnDelete }: CreateColumnsOptions<TData, any> = {},
): ColumnDef<TData>[] => {
  const { helper, builder } = createColumnBuilder<any>();
  return schema.columns.map((column) => {
    const { type, id, label, fixed, resize, ...props } = column;

    const options: BaseColumnOptions<TData, any> = stripUndefinedValues({
      ...props,
      meta: { resize },
      label,
      header: fixed
        ? undefined
        : () => <ColumnMenu column={column} onUpdate={onColumnUpdate} onDelete={onColumnDelete} />,
      onUpdate,
    });

    switch (type) {
      case 'number':
        return helper.accessor(id, builder.number(options));
      case 'boolean':
        return helper.accessor(id, builder.checkbox(options));
      case 'date':
        return helper.accessor(id, builder.date(options));
      case 'string':
      default:
        return helper.accessor(id, builder.string(options));
    }
  }) as ColumnDef<TData>[];
};

type CreateActionColumnOptions<TData extends RowData> = {
  onRowDelete?: (row: TData) => void;
  onColumnCreate?: (column: GridSchemaColumn) => void;
};

export const createActionColumn = <TData extends RowData>(
  schema: GridSchema,
  { onRowDelete, onColumnCreate }: CreateActionColumnOptions<TData> = {},
): ColumnDef<TData> => {
  const { helper } = createColumnBuilder<TData>();

  // TODO(burdon): Dropdown/dialog.
  const handleAddColumn = () => {
    onColumnCreate?.({
      id: createUniqueProp(schema),
      type: 'string',
      label: 'New column',
      editable: true,
      resize: true,
    });
  };

  return helper.display({
    id: '__new',
    size: 40,
    header: onColumnCreate
      ? () => (
          <Button variant='ghost' onClick={handleAddColumn}>
            <Plus className={getSize(4)} />
          </Button>
        )
      : undefined,
    // TODO(burdon): Check option.
    // TODO(burdon): Show on hover.
    cell: onRowDelete
      ? (cell) => (
          <Button variant='ghost' onClick={() => onRowDelete(cell.row.original)}>
            <X className={getSize(4)} />
          </Button>
        )
      : undefined,
  }) as ColumnDef<TData>;
};

export const createUniqueProp = (schema: GridSchema) => {
  for (let i = 1; i < 100; i++) {
    const prop = 'prop_' + i;
    if (!schema.columns.find((column) => column.id === prop)) {
      return prop;
    }
  }

  return 'prop_' + PublicKey.random().toHex().slice(0, 8);
};

export type ColumnMenuProps = {
  column: GridSchemaColumn;
  onUpdate?: (id: string, column: GridSchemaColumn) => void;
  onDelete?: (id: string) => void;
};

export const ColumnMenu = ({ column, onUpdate, onDelete }: ColumnMenuProps) => {
  const [prop, setProp] = useState(column.id);
  const [type, setType] = useState(String(column.type));
  const [label, setLabel] = useState(column.label ?? column.id);
  const [digits, setDigits] = useState(String(column.digits ?? '0'));

  const handleSave = () => {
    onUpdate?.(column.id, {
      ...column,
      id: prop,
      type: type as GridSchemaColumn['type'],
      label,
      digits: safeParseInt(digits),
    });
  };

  // TODO(burdon): Allow blank label (different from undefined).
  const title = column.label?.length ? column.label : column.id;

  return (
    <div className='flex grow items-center overflow-hidden'>
      <div className='truncate' title={title}>
        {title}
      </div>
      <div className='grow' />
      <div className='flex shrink-0'>
        <Popover.Root>
          <Popover.Trigger asChild>
            <Button variant='ghost' classNames='p-0'>
              <CaretDown className={getSize(4)} />
            </Button>
          </Popover.Trigger>
          <Popover.Content>
            <Popover.Viewport classNames='flex flex-col p-4 gap-4'>
              <div className='flex flex-col gap-2'>
                <div className='flex items-center'>
                  <Input.Root>
                    <Input.Label classNames='w-24'>Label</Input.Label>
                    <Input.TextInput value={label} onChange={(event) => setLabel(event.target.value)} autoFocus />
                  </Input.Root>
                </div>
                <div className='flex items-center'>
                  <Input.Root>
                    <Input.Label classNames='w-24'>Property</Input.Label>
                    <Input.TextInput value={prop} onChange={(event) => setProp(event.target.value)} />
                  </Input.Root>
                </div>
                <div className='flex items-center'>
                  <Input.Root>
                    <Input.Label classNames='w-24'>Type</Input.Label>
                    <Input.TextInput value={type} onChange={(event) => setType(event.target.value)} />
                  </Input.Root>
                </div>
                {type === 'number' && (
                  <div className='flex items-center'>
                    {/* TODO(burdon): Constrain input to numbers. */}
                    <Input.Root>
                      <Input.Label classNames='w-24'>Digits</Input.Label>
                      <Input.TextInput value={digits} onChange={(event) => setDigits(event.target.value)} />
                    </Input.Root>
                  </div>
                )}

                {/* TODO(burdon): Error: `RovingFocusGroupItem` must be used within `RovingFocusGroup`. */}
                {false && (
                  <Select.Root>
                    <Toolbar.Button asChild>
                      <Select.TriggerButton placeholder='Type' />
                    </Toolbar.Button>
                    <Select.Portal>
                      <Select.Content>
                        <Select.Viewport>
                          {/* TODO(burdon): Map values. */}
                          <Select.Option value={'string'}>String</Select.Option>
                          <Select.Option value={'boolean'}>Boolean</Select.Option>
                          <Select.Option value={'number'}>Number</Select.Option>
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                )}
              </div>

              {/* TODO(burdon): Style as DropdownMenuItem. */}
              <div className='flex flex-col gap-2'>
                <Button classNames='flex justify-start items-center gap-2' onClick={handleSave}>
                  <Check className={getSize(5)} />
                  <span>Save</span>
                </Button>
                <Button classNames='flex justify-start items-center gap-2' onClick={() => onDelete?.(column.id)}>
                  <Trash className={getSize(5)} />
                  <span>Delete</span>
                </Button>
              </div>
            </Popover.Viewport>
            <Popover.Arrow />
          </Popover.Content>
        </Popover.Root>
      </div>
    </div>
  );
};
