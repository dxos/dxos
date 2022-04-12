//
// Copyright 2022 DXOS.org
//

import { ObjectModel } from '@dxos/object-model';

type DataDef = 'string' | 'number' | 'boolean'
export type FieldDef = {
  key: string,
  type: DataDef
}

export class Schema {
  private _fields: Map<string, string> = new Map<string, string>();

  constructor (
    // private readonly _id: string,
    private readonly _schemaName: string,
    initialFields: FieldDef[]
  ) {
    initialFields.forEach(field => this.addField(field));
  }

  get fields () {
    return this._fields;
  }

  get schema () {
    return this._schemaName;
  }

  addField (field: FieldDef) {
    this._fields.set(field.key, field.type);
  }

  updateField (field: string, value: DataDef) {
    this._fields.set(field, value);
  }
}

// Schema: string -> name of the schema
// Fields: map of fields

// type field --> same field as the schema field
// Does our query sintax support finding items of type schema (well yes).
// UseSelection find schemas and items of that type/schema
