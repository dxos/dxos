//
// Copyright 2023 DXOS.org
//

import { Plus, X } from '@phosphor-icons/react';
import { ColumnDef, RowData } from '@tanstack/react-table';
import React from 'react';

import { Button } from '@dxos/aurora';
import { PublicKey } from '@dxos/keys';

import { createColumnBuilder } from './helpers';

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
  editable?: boolean;
  resize?: boolean;
};

// TODO(burdon): Create builder.
type CreateColumnsOptions<TData extends RowData, TValue> = {
  onUpdate?: (row: TData, id: string, value: TValue) => void;
  onRowDelete?: (row: TData) => void;
  onColumnCreate?: (column: GridSchemaColumn) => void;
};

/**
 * Create column definitions from schema metadata.
 */
// TODO(burdon): Specialize for TypedObject and move to plugin-grid.
export const createColumns = <TData extends RowData>(
  schema: GridSchema,
  { onUpdate, onRowDelete, onColumnCreate }: CreateColumnsOptions<TData, any> = {},
): ColumnDef<TData>[] => {
  const { helper, builder } = createColumnBuilder<any>();
  const columns: ColumnDef<TData>[] = schema.columns.map(({ id, type, resize, ...props }) => {
    switch (type) {
      case 'number':
        return helper.accessor(id, builder.number({ meta: { resize }, onUpdate, ...props }));
      case 'boolean':
        return helper.accessor(id, builder.checkbox({ meta: { resize }, onUpdate, ...props }));
      case 'string':
      default:
        return helper.accessor(id, builder.string({ meta: { resize }, onUpdate, ...props }));
    }
  }) as ColumnDef<TData>[];

  if (onColumnCreate || onRowDelete) {
    columns.push(createActionColumn({ onRowDelete, onColumnCreate }));
  }

  return columns;
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
