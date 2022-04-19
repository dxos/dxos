//
// Copyright 2022 DXOS.org
//

import faker from 'faker';

import { Item, Party } from '@dxos/client';
import { ObjectModel } from '@dxos/object-model';

import { NumberRange, getNumber } from '../util';

// TODO(kaplanski): Discuss where we should obtain this from.
export const TYPE_TABLE_COLUMN = 'dxos:type/table/column';
export const TYPE_TABLE_ROW = 'dxos:type/table/row';
export const TYPE_TABLE_COLUMN_LINK = 'dxos:type/table/column-link';

type FieldGenerator = () => string;
type Field = {
  columnId: string
  fieldName?: string
  generator?: FieldGenerator
}

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
 * @deprecated
 */
// TODO(burdon): Remove (table specific).
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

  async createColumn (customField?: string) {
    const field = customField ?? faker.database.column();
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

  async createColumns (n: NumberRange = 1, customFields?: string[]) {
    if (customFields && customFields.length) {
      return await Promise.all(customFields.map(async (customField) => {
        return await this.createColumn(customField);
      }));
    }

    return await Promise.all(Array.from({ length: getNumber(n) }).map(async () => {
      return await this.createColumn();
    }));
  }

  async createRow (fields: Field[]) {
    const rowProps = fields.map((field) => {
      return {
        [field.columnId]: field.generator ? field.generator() : faker.lorem.word()
      };
    }).flat();
    const row = Object.assign({}, { id: faker.datatype.uuid() }, ...rowProps);
    return await this._party.database.createItem({
      model: ObjectModel,
      type: TYPE_TABLE_ROW,
      parent: this._table.id,
      props: row
    });
  }

  async createRows (fields: Field[], n: NumberRange = 1) {
    return await Promise.all(Array.from({ length: getNumber(n) }).map(async () => {
      return await this.createRow(fields);
    }));
  }
}
