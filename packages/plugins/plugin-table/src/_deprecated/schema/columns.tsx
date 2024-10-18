//
// Copyright 2023 DXOS.org
//

import { Plus, X } from '@phosphor-icons/react';
import React from 'react';

import { type EchoReactiveObject, getType } from '@dxos/echo-schema';
import { type EchoDatabase, type Space } from '@dxos/react-client/echo';
import { Button } from '@dxos/react-ui';
import {
  type BaseColumnOptions,
  ColumnMenu,
  type ColumnDef,
  createColumnBuilder,
  type SearchListQueryModel,
  type TableColumnDef,
  type TableDef,
} from '@dxos/react-ui-table';
import { getSize } from '@dxos/react-ui-theme';
import { FieldValueType } from '@dxos/schema';

import { getUniqueProperty } from './types';

type ColumnCreationOptions = {
  onColumnUpdate?: (id: string, column: ColumnDef) => void;
  onColumnDelete?: (id: string) => void;
  onRowUpdate?: (object: any, key: string, value: any) => void;
  onRowDelete?: (object: any) => void;
};

export const createColumnsFromTableDef = ({
  space,
  tableDef,
  tablesToReference,
  onColumnReorder,
  ...options
}: {
  space: Space;
  tableDef: TableDef;
  tablesToReference: TableDef[];
  onColumnReorder: (columnId: string, direction: 'right' | 'left') => void;
} & ColumnCreationOptions): TableColumnDef<any>[] => {
  const dataColumns = createColumns(tableDef, tablesToReference, space, onColumnReorder, options);
  const actionColumn = createActionColumn(tableDef, options);

  return [...dataColumns, actionColumn];
};

/**
 * Create column definitions from schema metadata.
 */
// TODO(burdon): Space first.
export const createColumns = (
  tableDef: TableDef,
  tablesToReference: TableDef[],
  space: Space,
  onColumnReorder: (columnId: string, direction: 'right' | 'left') => void,
  { onRowUpdate, onColumnUpdate, onColumnDelete }: ColumnCreationOptions = {},
): TableColumnDef<any>[] => {
  const { helper, builder } = createColumnBuilder<any>();

  return tableDef.columns.map((column) => {
    const { type, id, label, fixed, resizable, ...props } = column;
    const columnIndex = tableDef.columns.indexOf(column);
    const columnPosition =
      columnIndex === 0 ? 'start' : columnIndex === tableDef.columns.length - 1 ? 'end' : undefined;

    const options: BaseColumnOptions<EchoReactiveObject<any>, any> = {
      ...props,
      meta: { resizable },
      label,
      header: fixed
        ? undefined
        : (context) => (
            <ColumnMenu<any, any>
              context={context}
              tablesToReference={tablesToReference}
              tableDef={tableDef}
              column={column}
              columnOrderable={tableDef.columns.length > 1}
              columnPosition={columnPosition}
              onUpdate={onColumnUpdate}
              onDelete={onColumnDelete}
              onColumnReorder={onColumnReorder}
            />
          ),
      onUpdate: onRowUpdate,
    };

    switch (type) {
      case FieldValueType.Ref:
        return helper.accessor(
          id,
          builder.combobox({ ...options, model: new QueryModel(space!.db, column.refTable!, column.refProp!) }),
        );
      case FieldValueType.Number:
        return helper.accessor(id, builder.number(options));
      case FieldValueType.Boolean:
        return helper.accessor(id, builder.switch(options));
      case FieldValueType.Date:
        return helper.accessor(id, builder.date(options));
      case FieldValueType.String:
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
  { onColumnUpdate, onRowDelete }: ColumnCreationOptions = {},
): TableColumnDef<EchoReactiveObject<any>> => {
  const { helper } = createColumnBuilder<EchoReactiveObject<any>>();

  const handleAddColumn = () => {
    const id = getUniqueProperty(tableDef);
    onColumnUpdate?.(id, {
      id,
      prop: id,
      type: FieldValueType.String,
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
            <Button variant='ghost' onClick={handleAddColumn} title='New column' data-testid='table.new-column'>
              <Plus className={getSize(4)} />
            </Button>
          </div>
        )
      : undefined,
    cell: onRowDelete
      ? (context) => {
          if (context?.table?.options?.state?.rowPinning?.bottom?.includes(context.row.id)) {
            // We're in the `add row` row so don't show the delete button.
            return null;
          }

          return context.row.original.id ? (
            <div className='grid place-items-center'>
              <Button
                variant='ghost'
                onClick={() => onRowDelete(context.row.original)}
                title='Delete row'
                classNames='rounded-none'
                data-testid='table.delete-row'
              >
                <X className={getSize(3)} />
              </Button>
            </div>
          ) : null;
        }
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
    const { objects = [] } = await this._db
      .query((object: EchoReactiveObject<any>) => {
        if (!text?.length) {
          return null;
        }

        if (getType(object)?.objectId !== this._schemaId) {
          return false;
        }

        const label = this.getText(object);
        if (!label || !label.toLowerCase().includes(text.toLowerCase())) {
          return false;
        }

        return true;
      })
      .run();

    return objects;
  }
}
