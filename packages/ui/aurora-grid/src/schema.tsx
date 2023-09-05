//
// Copyright 2023 DXOS.org
//

import { Check, DotsThree, Plus, Trash, X } from '@phosphor-icons/react';
import { ColumnDef, RowData } from '@tanstack/react-table';
import React, { useEffect, useState } from 'react';

import { Button, Input, Popover, Select, Toolbar } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/keys';
import { stripUndefinedValues } from '@dxos/util';

import { BaseColumnOptions, createColumnBuilder } from './helpers';

/**
 * Serializable schema.
 */
export type GridSchema = {
  columns: GridSchemaColumn[];
};

export type GridSchemaColumn = {
  id: string;
  type: 'number' | 'boolean' | 'string'; // TODO(burdon): 'key'.
  size?: number;
  label?: string;

  // TODO(burdon): Move to meta.
  fixed?: boolean;
  editable?: boolean;
  resize?: boolean;
};

// TODO(burdon): Create builder.
type CreateColumnsOptions<TData extends RowData, TValue> = {
  onUpdate?: (row: TData, id: string, value: TValue) => void;
  onRowDelete?: (row: TData) => void;
  onColumnCreate?: (column: GridSchemaColumn) => void;
  onColumnUpdate?: (column: GridSchemaColumn) => void;
  onColumnDelete?: (column: ColumnDef<TData, TValue>) => void;
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
      meta: { resize },
      label,
      header: fixed
        ? undefined
        : () => <ColumnMenu column={column} onSave={onColumnUpdate} onDelete={onColumnDelete} />,
      onUpdate,
      ...props,
    });

    switch (type) {
      case 'number':
        return helper.accessor(id, builder.number(options));
      case 'boolean':
        return helper.accessor(id, builder.checkbox(options));
      case 'string':
      default:
        return helper.accessor(id, builder.string(options));
    }
  }) as ColumnDef<TData>[];
};

// TODO(burdon): Move to helper.
export const createActionColumn = <TData extends RowData>({
  onRowDelete,
  onColumnCreate,
}: CreateColumnsOptions<TData, any> = {}): ColumnDef<TData> => {
  const { helper } = createColumnBuilder<TData>();

  // TODO(burdon): Dropdown/dialog.
  const handleAddColumn = () => {
    onColumnCreate?.({
      id: 'prop_' + PublicKey.random().toHex().slice(0, 8),
      type: 'string',
      label: 'new column',
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
            <Plus />
          </Button>
        )
      : undefined,
    // TODO(burdon): Check option.
    // TODO(burdon): Show on hover.
    cell: onRowDelete
      ? (cell) => (
          <Button variant='ghost' onClick={() => onRowDelete(cell.row.original)}>
            <X />
          </Button>
        )
      : undefined,
  }) as ColumnDef<TData>;
};

export type ColumnMenuProps = {
  column: GridSchemaColumn;
  onSave?: (column: GridSchemaColumn) => void;
  onDelete?: (column: GridSchemaColumn) => void;
};

export const ColumnMenu = ({ column, onSave, onDelete }: ColumnMenuProps) => {
  const [prop, setProp] = useState(column.id);
  const [label, setLabel] = useState(column.label ?? column.id);
  useEffect(() => {
    setLabel(column.label ?? column.id);
  }, []);
  const handleSave = () => {
    onSave?.({ ...column, label });
  };

  return (
    <div className='flex grow items-center'>
      <div>{column.label ?? column.id}</div>
      <div className='grow' />
      <div>
        <Popover.Root>
          <Popover.Trigger asChild>
            <Button variant='ghost' classNames='p-0'>
              <DotsThree className={getSize(5)} />
            </Button>
          </Popover.Trigger>
          <Popover.Content>
            <Popover.Viewport classNames='p-2'>
              <div className='flex flex-col mb-2'>
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

                <div className='flex flex-col gap-2'>
                  <Input.Root>
                    <Input.Label classNames='px-2'>Property</Input.Label>
                    <Input.TextInput autoFocus value={prop} onChange={(event) => setProp(event.target.value)} />
                  </Input.Root>
                  <Input.Root>
                    <Input.Label classNames='px-2'>Label</Input.Label>
                    <Input.TextInput value={label} onChange={(event) => setLabel(event.target.value)} />
                  </Input.Root>
                </div>
              </div>

              {/* TODO(burdon): Style as DropdownMenuItem. */}
              <div className='flex flex-col'>
                <Button classNames='flex justify-start items-center gap-2' onClick={handleSave}>
                  <Check />
                  <span>Save</span>
                </Button>
                <Button classNames='flex justify-start items-center gap-2' onClick={() => onDelete?.(column)}>
                  <Trash />
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
