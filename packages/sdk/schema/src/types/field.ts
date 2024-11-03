//
// Copyright 2024 DXOS.org
//

import { FormatSchema, type ReactiveObject, S, type StoredSchema, type FormatType } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

import { FieldSchema, type FieldType, type ViewType } from './view';

// TODO(burdon): Field and Format are in different namespaces so we ideally shouldn't merge here.
export const FieldProjectionSchema = S.extend(FieldSchema, FormatSchema);

export type FieldProjectionType = S.Schema.Type<typeof FieldProjectionSchema>;

/**
 * Wrapper for View that manages Field and Format updates.
 */
export class ViewProjection {
  constructor(
    private readonly _schema: ReactiveObject<StoredSchema>,
    private readonly _view: ViewType,
  ) {}

  getFieldProjection(property: string): FieldProjectionType {
    const field = this._view.fields.find((f) => f.property === property) ?? { property };
    const properties = this._schema.jsonSchema.properties[property] as any as FormatType;
    invariant(properties);
    return { ...field, ...properties };
  }

  updateField = (value: FieldType) => {
    const field = this._view.fields.find((f) => f.property === value.property);
    if (field) {
      Object.assign(field, value);
    } else {
      this._view.fields.push({ ...value });
    }
  };

  updateFormat(property: string, value: Partial<FormatType>) {
    const properties = this._schema.jsonSchema.properties[property] as any as FormatType;
    Object.assign(properties, value);
  }
}
