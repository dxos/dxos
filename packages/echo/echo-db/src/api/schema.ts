//
// Copyright 2022 DXOS.org
//

import { ObjectModel } from '@dxos/object-model';

export const TYPE_SCHEMA = 'dxos:type/schema';

export type FieldType = 'string' | 'number' | 'boolean' | 'ref'

// TODO(burdon): Protobuf definitions.

export type SchemaRef = {
  schema: string
  field: string
}

export type SchemaField = {
  key: string
  type?: FieldType
  required: boolean
  ref?: SchemaRef
}

export type SchemaDef = {
  schema: string
  fields: SchemaField[]
}

/**
 * Wrapper for ECHO Item that represents an `ObjectModel` schema.
 */
export class Schema {
  constructor (
    private readonly _schema: ObjectModel
  ) {}

  get name (): string {
    return this._schema.get('schema');
  }

  get fields (): SchemaField[] {
    return Object.values(this._schema.get('fields') ?? {});
  }

  getField (key: string): SchemaField | undefined {
    return this.fields.find(field => field.key === key);
  }

  // TODO(kaplanski): What happens if an item has extra properties?
  validate (model: ObjectModel) {
    return this.fields.every(field => {
      const value = model.get(field.key);
      if (!value) {
        return !field.required;
      }

      if (field.type) {
        if (typeof value !== field.type) {
          return false;
        }
      }

      if (field.ref) {
        // TODO(kaplanski): Should this class have access to all items in the party to validate?
        // Or maybe possible values should be provided?
      }
      return true;
    });
  }

  // TODO(kaplanski): Should the field be added to each item using the schema in the party? (Empty value?)
  // TODO(kaplanski): Should the type be infered from the first value added?
  async addField (newField: SchemaField) {
    const newFields = [
      ...this.fields,
      newField
    ];
    // TODO(kaplanski): Create a SET mutation to just modify the field (not all fields).
    await this._schema.set('fields', newFields);
  }

  // TODO(kaplanski): Should editing a field modify all existing items using this schema?
  async editField (currentKey: string, editedField: SchemaField) {
    const newFields = this.fields.map(field => {
      if (field.key === currentKey) {
        return editedField;
      }
      return field;
    });
    await this._schema.set('fields', newFields);
  }

  async deleteField (key: string) {
    const newFields = this.fields.filter(field => field.key !== key);
    await this._schema.set('fields', newFields);
  }
}
