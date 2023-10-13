//
// Copyright 2023 DXOS.org
//

import { Plus, X } from '@phosphor-icons/react';
import React from 'react';

import { Button } from '@dxos/aurora';
import {
  createColumnBuilder,
  type BaseColumnOptions,
  ColumnMenu,
  type SelectQueryModel,
  type TableColumnDef,
  type ColumnProps,
  type TableDef,
} from '@dxos/aurora-table';
import { getSize } from '@dxos/aurora-theme';
import { type EchoDatabase, type Space, type TypedObject } from '@dxos/client/echo';
import { stripUndefinedValues } from '@dxos/util';

import { createUniqueProp } from './types';

type TableColumnBuilderOptions = {
  onColumnUpdate?: (id: string, column: ColumnProps) => void;
  onColumnDelete?: (id: string) => void;
  onRowUpdate?: (object: TypedObject, key: string, value: any) => void;
  onRowDelete?: (object: TypedObject) => void;
};

/**
 *
 */
export class TableColumnBuilder {
  private readonly _tableDef?: TableDef;

  // prettier-ignore
  constructor(
    private readonly _tableDefs: TableDef[],
    tableId: string,
    private readonly _space: Space,
    private readonly _options: TableColumnBuilderOptions
  ) {
    this._tableDef = this._tableDefs.find((def) => def.id === tableId);
  }

  createColumns(): TableColumnDef<TypedObject>[] {
    if (!this._tableDef) {
      return [];
    }

    const dataColumns = createColumns(this._tableDefs, this._tableDef, this._space, this._options);
    const actionColumn = createActionColumn(this._tableDef, this._options);

    return [...dataColumns, actionColumn];
  }
}

/**
 * Create column definitions from schema metadata.
 */
export const createColumns = (
  tableDefs: TableDef[],
  tableDef: TableDef,
  space: Space,
  { onRowUpdate, onColumnUpdate, onColumnDelete }: TableColumnBuilderOptions = {},
): TableColumnDef<TypedObject>[] => {
  const { helper, builder } = createColumnBuilder<any>();
  return tableDef.columns.map((column) => {
    const { type, id, label, fixed, resizable, ...props } = column;

    const options: BaseColumnOptions<TypedObject, any> = stripUndefinedValues({
      ...props,
      meta: { resizable },
      label,
      header: fixed
        ? undefined
        : (context) => (
            <ColumnMenu<TypedObject, any>
              context={context}
              tableDefs={tableDefs}
              tableDef={tableDef}
              column={column}
              onUpdate={onColumnUpdate}
              onDelete={onColumnDelete}
            />
          ),
      onUpdate: onRowUpdate,
    });

    switch (type) {
      case 'ref':
        return helper.accessor(
          id,
          builder.select({ ...options, model: new QueryModel(space!.db, column.refTable!, column.refProp!) }),
        );
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
  }) as TableColumnDef<TypedObject>[];
};

/**
 * Create action column to create columns and delete rows.
 */
export const createActionColumn = (
  tableDef: TableDef,
  { onColumnUpdate, onRowDelete }: TableColumnBuilderOptions = {},
): TableColumnDef<TypedObject> => {
  const { helper } = createColumnBuilder<TypedObject>();

  const handleAddColumn = () => {
    const id = createUniqueProp(tableDef);
    onColumnUpdate?.(id, {
      id,
      prop: id,
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
    header: onColumnUpdate
      ? () => (
          <Button variant='ghost' onClick={handleAddColumn} title='New column'>
            <Plus className={getSize(4)} />
          </Button>
        )
      : undefined,
    cell: onRowDelete
      ? (cell) =>
          cell.row.original.id ? (
            <Button variant='ghost' onClick={() => onRowDelete(cell.row.original)} title='Delete row'>
              <X className={getSize(4)} />
            </Button>
          ) : null
      : undefined,
  }) as TableColumnDef<TypedObject>;
};

// TODO(burdon): Factor out.
class QueryModel implements SelectQueryModel<TypedObject> {
  constructor(private readonly _db: EchoDatabase, private readonly _schema: string, private readonly _prop: string) {}

  getId(object: TypedObject) {
    return object.id;
  }

  getText(object: TypedObject) {
    return object[this._prop];
  }

  async query(text?: string) {
    const { objects = [] } = this._db.query((object) => {
      if (!text?.length) {
        return null;
      }

      if (object.__schema?.id !== this._schema) {
        return false;
      }

      const label = this.getText(object);
      if (!label || !label.toLowerCase().includes(text.toLowerCase())) {
        return false;
      }

      return true;
    });

    return objects;
  }
}
