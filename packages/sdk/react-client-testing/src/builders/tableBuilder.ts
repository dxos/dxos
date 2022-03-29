//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import { useMemo } from 'react';

import { Item, Party } from '@dxos/client';
import { ObjectModel } from '@dxos/object-model';

import { NumberRange, getNumber } from '../utils';

// TODO(kaplanski): Discuss where we should obtain this from.
export const TYPE_TABLE_COLUMN = 'dxos:type.table.column';
export const TYPE_TABLE_ROW = 'dxos:type.table.row';
export const TYPE_TABLE_COLUMN_LINK = 'dxos:type.table.column-link';

/**
 * Table column builder.
 */
export class ColumnBuilder {
  constructor (
    private readonly _builder: TableBuilder,
    private readonly _table: Item<ObjectModel>
  ) {}

  get table () {
    return this._table;
  }
}

/**
 * Class containing methods for building a table, with columns and rows. Used for testing.
 */
export class TableBuilder {
  constructor (
    private readonly _party: Party,
    private readonly _table: Item<ObjectModel>
  ) {}

  get party () {
    return this._party;
  }

  get table () {
    return this._table;
  }

  async createColumn () {
    const field = faker.database.column();
    return this._party.database.createItem({
      model: ObjectModel,
      type: TYPE_TABLE_COLUMN,
      parent: this._table.id,
      props: {
        columnType: 'value',
        editable: true,
        field: field,
        title: field.charAt(0).toLocaleUpperCase() + field.slice(1),
        minWidth: 150
      }
    });
  }

  async createColumns (n: NumberRange = 1) {
    return await Promise.all(Array.from({ length: getNumber(n) }).map(async () => {
      return await this.createColumn();
    }));
  }

  async createRow (fieldIds: string[], n: NumberRange = 1) {
    return await Promise.all(Array.from(new Array(n)).map(() => {
      const rowProps = fieldIds.map((fieldId: string) => ({ [fieldId]: faker.lorem.word() })).flat();
      const row = Object.assign({}, { id: faker.datatype.uuid() }, ...rowProps);
      return this._party.database.createItem({
        model: ObjectModel,
        type: TYPE_TABLE_ROW,
        parent: this._table.id,
        props: row
      });
    }));
  }

  async createRows (fieldIds: string[], n: NumberRange = 1) {
    return await Promise.all(Array.from({ length: getNumber(n) }).map(async () => {
      return await this.createRow(fieldIds, n);
    }));
  }
}

/**
 * @param party
 * @param table
 */
export const useTableBuilder = (party?: Party, table?: Item<ObjectModel>) => {
  return useMemo(() => (party && table) ? new TableBuilder(party, table) : undefined, [table?.id]);
};
