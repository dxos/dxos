//
// Copyright 2023 DXOS.org
//

import { Plus, X } from '@phosphor-icons/react';
import { ColumnDef, RowData } from '@tanstack/react-table';
import React from 'react';

import { Button } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/keys';
import { stripUndefinedValues } from '@dxos/util';

import { ColumnMenu } from './ColumnMenu';
import { BaseColumnOptions, createColumnBuilder } from './helpers';

/**
 * Serializable schema.
 */
export type GridSchema = {
  columns: GridSchemaColumn[];
};

export type GridSchemaColumn = {
  id: string;
  type: 'number' | 'boolean' | 'date' | 'string' | 'ref';
  size?: number;
  label?: string;

  digits?: number;

  ref?: string;
  refProp?: string;

  // TODO(burdon): Move to meta.
  fixed?: boolean;
  editable?: boolean;
  resizable?: boolean;
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
    const { type, id, label, fixed, resizable, ...props } = column;

    const options: BaseColumnOptions<TData, any> = stripUndefinedValues({
      ...props,
      meta: { resizable },
      label,
      header: fixed
        ? undefined
        : (context) => (
            <ColumnMenu<TData, any>
              context={context}
              schema={schema}
              column={column}
              onUpdate={onColumnUpdate}
              onDelete={onColumnDelete}
            />
          ),
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
  isDeletable?: (row: TData) => boolean;
  onRowDelete?: (row: TData) => void;
  onColumnCreate?: (column: GridSchemaColumn) => void;
};

export const createActionColumn = <TData extends RowData>(
  schema: GridSchema,
  { isDeletable, onRowDelete, onColumnCreate }: CreateActionColumnOptions<TData> = {},
): ColumnDef<TData> => {
  const { helper } = createColumnBuilder<TData>();

  const handleAddColumn = () => {
    onColumnCreate?.({
      id: createUniqueProp(schema),
      type: 'string',
      editable: true,
      resizable: true,
    });
  };

  return helper.display({
    id: '__new',
    size: 40,
    meta: {
      slots: {
        header: {
          className: 'p-0',
        },
        footer: {
          className: 'p-0',
        },
        cell: {
          className: 'p-0',
        },
      },
    },
    // TODO(burdon): Translation.
    header: onColumnCreate
      ? () => (
          <Button variant='ghost' onClick={handleAddColumn} title='New column'>
            <Plus className={getSize(4)} />
          </Button>
        )
      : undefined,
    cell: onRowDelete
      ? (cell) =>
          isDeletable?.(cell.row.original) ? (
            <Button variant='ghost' onClick={() => onRowDelete(cell.row.original)} title='Delete row'>
              <X className={getSize(4)} />
            </Button>
          ) : null
      : undefined,
  }) as ColumnDef<TData>;
};
