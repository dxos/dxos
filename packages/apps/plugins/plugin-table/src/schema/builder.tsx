//
// Copyright 2023 DXOS.org
//

import { Plus, X } from '@phosphor-icons/react';
import React from 'react';

import { type EchoReactiveObject, typeOf } from '@dxos/echo-schema';
import { type EchoDatabase, type Space } from '@dxos/react-client/echo';
import { Button } from '@dxos/react-ui';
import {
  createColumnBuilder,
  type BaseColumnOptions,
  ColumnMenu,
  type SearchListQueryModel,
  type TableColumnDef,
  type ColumnProps,
  type TableDef,
} from '@dxos/react-ui-table';
import { getSize } from '@dxos/react-ui-theme';

import { createUniqueProp } from './types';

type TableColumnBuilderOptions = {
  onColumnUpdate?: (id: string, column: ColumnProps) => void;
  onColumnDelete?: (id: string) => void;
  onRowUpdate?: (object: any, key: string, value: any) => void;
  onRowDelete?: (object: any) => void;
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

  createColumns(): TableColumnDef<any>[] {
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
): TableColumnDef<any>[] => {
  const { helper, builder } = createColumnBuilder<any>();
  return tableDef.columns.map((column) => {
    const { type, id, label, fixed, resizable, ...props } = column;

    const options: BaseColumnOptions<EchoReactiveObject<any>, any> = {
      ...props,
      meta: { resizable },
      label,
      header: fixed
        ? undefined
        : (context) => (
            <ColumnMenu<any, any>
              context={context}
              tableDefs={tableDefs}
              tableDef={tableDef}
              column={column}
              onUpdate={onColumnUpdate}
              onDelete={onColumnDelete}
            />
          ),
      onUpdate: onRowUpdate,
    };

    switch (type) {
      case 'ref':
        return helper.accessor(
          id,
          builder.combobox({ ...options, model: new QueryModel(space!.db, column.refTable!, column.refProp!) }),
        );
      case 'number':
        return helper.accessor(id, builder.number(options));
      case 'boolean':
        return helper.accessor(id, builder.switch(options));
      case 'date':
        return helper.accessor(id, builder.date(options));
      case 'string':
      default:
        return helper.accessor(id, builder.string(options));
    }
  }) as TableColumnDef<EchoReactiveObject<any>>[];
};

/**
 * Create action column to create columns and delete rows.
 */
export const createActionColumn = (
  tableDef: TableDef,
  { onColumnUpdate, onRowDelete }: TableColumnBuilderOptions = {},
): TableColumnDef<EchoReactiveObject<any>> => {
  const { helper } = createColumnBuilder<EchoReactiveObject<any>>();

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
    size: 48,
    // TODO(burdon): Translation.
    header: onColumnUpdate
      ? () => (
          <div className='grid place-items-center'>
            <Button variant='ghost' onClick={handleAddColumn} title='New column'>
              <Plus className={getSize(4)} />
            </Button>
          </div>
        )
      : undefined,
    cell: onRowDelete
      ? (cell) =>
          cell.row.original.id ? (
            <div className='grid place-items-center'>
              <Button
                variant='ghost'
                onClick={() => onRowDelete(cell.row.original)}
                title='Delete row'
                classNames='rounded-none'
              >
                <X className={getSize(4)} />
              </Button>
            </div>
          ) : null
      : undefined,
  }) as TableColumnDef<EchoReactiveObject<any>>;
};

// TODO(burdon): Factor out.
class QueryModel implements SearchListQueryModel<EchoReactiveObject<any>> {
  constructor(
    private readonly _db: EchoDatabase,
    private readonly _schemaId: string,
    private readonly _prop: string,
  ) {}

  getId(object: EchoReactiveObject<any>) {
    return object.id;
  }

  getText(object: EchoReactiveObject<any>) {
    return object[this._prop];
  }

  async query(text?: string) {
    const { objects = [] } = this._db.query((object: EchoReactiveObject<any>) => {
      if (!text?.length) {
        return null;
      }

      if (typeOf(object)?.itemId !== this._schemaId) {
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
