//
// Copyright 2024 DXOS.org
//

import { FormatSchema, type FormatType, type MutableSchema, S } from '@dxos/echo-schema';

import { FieldSchema, type FieldType, type ViewType } from './view';

// TODO(burdon): Field and Format are in different namespaces so we ideally shouldn't merge here.
export const FieldProjectionSchema = S.extend(FieldSchema, FormatSchema);

export type FieldProjectionType = S.Schema.Type<typeof FieldProjectionSchema>;

/**
 * Wrapper for View that manages Field and Format updates.
 */
export class ViewProjection {
  constructor(
    // TODO(burdon): Consider how to use tables with static schema.
    private readonly _schema: MutableSchema,
    private readonly _view: ViewType,
  ) {}

  getFieldProjection(property: string): FieldProjectionType {
    const field = this._view.fields.find((f) => f.property === property) ?? { property };
    const properties = this._schema.jsonSchema.properties[property] as any as FormatType;
    return { ...field, ...properties };
  }

  updateField = (value: FieldType): FieldType => {
    let field = this._view.fields.find((f) => f.property === value.property);
    if (field) {
      Object.assign(field, value);
    } else {
      field = { ...value };
      this._view.fields.push(field);
    }
    return field;
  };

  updateFormat(property: string, value: Partial<FormatType>): FormatType {
    const properties = this._schema.jsonSchema.properties[property] as any as FormatType;
    Object.assign(properties, value);
    return properties;
  }
}
