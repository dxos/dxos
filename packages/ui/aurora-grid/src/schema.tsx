//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import { ColumnDef, RowData } from '@tanstack/react-table';
import React from 'react';

import { Button } from '@dxos/aurora';
import { PublicKey } from '@dxos/keys';

import { createColumnBuilder, ValueUpdater } from './helpers';

/**
 * Serializable schema.
 */
export type GridSchema = {
  columns: GridSchemaColumn[];
};

export type GridSchemaColumn = {
  key: string;
  type: 'number' | 'boolean' | 'string';
  size?: number;
  header?: string;
  editable?: boolean;
  resize?: boolean;
};

/**
 * Create column definitions from schema metadata.
 */
// TODO(burdon): Specialize for TypedObject and move to plugin-grid.
export const createColumns = <TData extends RowData>(
  schema: GridSchema,
  // TODO(burdon): Options.
  onUpdate?: ValueUpdater<TData, any>,
  onNewColumn?: (column: GridSchemaColumn) => void,
): ColumnDef<TData>[] => {
  const { helper, builder } = createColumnBuilder<any>();
  const columns: ColumnDef<TData>[] = schema.columns.map(({ key, type, resize, ...props }) => {
    switch (type) {
      case 'number':
        return helper.accessor(key, builder.number({ meta: { resize }, onUpdate, ...props }));
      case 'boolean':
        return helper.accessor(key, builder.checkbox({ meta: { resize }, onUpdate, ...props }));
      case 'string':
      default:
        return helper.accessor(key, builder.string({ meta: { resize }, onUpdate, ...props }));
    }
  }) as ColumnDef<TData>[];

  // TODO(burdon): Dropdown/dialog.
  if (onNewColumn) {
    const handleAddColumn = () => {
      onNewColumn({
        key: PublicKey.random().toHex(),
        type: 'string',
        header: 'new column',
        editable: true,
        resize: true,
      });
    };

    columns.push(
      helper.display({
        id: '__new',
        size: 40,
        header: () => (
          <Button variant='ghost' onClick={handleAddColumn}>
            <Plus />
          </Button>
        ),
      }) as ColumnDef<TData>,
    );
  }

  return columns;
};
