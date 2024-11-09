//
// Copyright 2024 DXOS.org
//

import {
  JSON_SCHEMA_ECHO_REF_ID,
  formatToType,
  typeToFormat,
  FormatEnum,
  type JsonSchemaType,
  type MutableSchema,
  S,
  TypeEnum,
  type JsonProp,
} from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { PropertySchema, type PropertyType } from './format';
import { type ViewType, type FieldType } from './view';

/**
 * Composite of view and schema metadata for a property.
 */
export type FieldProjection = {
  field: FieldType;
  props: PropertyType;
};

/**
 * Wrapper for View that manages Field and Format updates.
 */
export class ViewProjection {
  private readonly _encode = S.encodeSync(PropertySchema);
  private readonly _decode = S.decodeSync(PropertySchema, {});

  constructor(
    // TODO(burdon): This could be StoredSchema?
    // TODO(burdon): Consider how to use tables with static schema.
    private readonly _schema: MutableSchema,
    private readonly _view: ViewType,
  ) {}

  /**
   * Construct a new property.
   */
  createFieldProjection(): FieldType {
    const prop = getUniqueProperty(this._view);
    const field: FieldType = {
      property: prop,
    };

    log('createFieldProjection', { field });
    this._view.fields.push(field);
    return field;
  }

  /**
   * Get projection of View fields and JSON schema property annotations.
   */
  getFieldProjection(prop: JsonProp): FieldProjection {
    const {
      $id,
      type: schemaType,
      format: schemaFormat = FormatEnum.None,
      reference,
      ...rest
    } = this._schema.jsonSchema.properties![prop] ?? { property: prop, format: FormatEnum.None };
    let type: TypeEnum = schemaType as TypeEnum;
    let format: FormatEnum = schemaFormat as FormatEnum;

    // Map reference.
    let referenceSchema: string | undefined;
    if ($id && reference) {
      type = TypeEnum.Ref;
      format = FormatEnum.Ref;
      referenceSchema = reference.schema.$ref;
    }
    if (format === FormatEnum.None) {
      format = typeToFormat[type as TypeEnum]!;
    }

    const field: FieldType = this._view.fields.find((f) => f.property === prop) ?? { property: prop as JsonProp };
    const values = { property: prop, type, format, referenceSchema, ...rest };
    const props = values.type ? this._decode(values) : values;

    log('getFieldProjection', { field, props });
    return { field, props };
  }

  /**
   * Update JSON schema property annotations and view fields.
   * @param projection The field and props to update
   * @param index Optional index for inserting new fields. Ignored when updating existing fields.
   */
  setFieldProjection({ field, props }: Partial<FieldProjection>, index?: number) {
    log.info('setFieldProjection', { field, props, index });

    if (field) {
      const sourcePropertyName = field.property;
      const targetPropertyName = props?.property;
      const isRename = targetPropertyName && targetPropertyName !== sourcePropertyName;

      const fieldIndex = this._view.fields.findIndex((f) => f.property === sourcePropertyName);
      const isNewField = fieldIndex === -1;
      if (isNewField) {
        const newField = { ...field };
        if (typeof index === 'number' && index >= 0 && index <= this._view.fields.length) {
          this._view.fields.splice(index, 0, newField);
        } else {
          this._view.fields.push(field, newField);
        }
      } else {
        if (isRename) {
          delete this._schema.jsonSchema.properties![field.property];
          Object.assign(this._view.fields[fieldIndex], field, { property: targetPropertyName });
        } else {
          Object.assign(this._view.fields[fieldIndex], field);
        }
      }
    }

    if (props) {
      let { property, type, format, referenceSchema, ...rest }: Partial<PropertyType> = this._encode(props);
      invariant(property);
      invariant(format);

      // Handle property rename in schema.
      if (field && property !== field.property) {
        const oldPropertySchema = this._schema.jsonSchema.properties?.[field.property];
        if (oldPropertySchema) {
          delete this._schema.jsonSchema.properties![field.property];
        }
      }

      let $id;
      let reference;
      if (referenceSchema) {
        $id = JSON_SCHEMA_ECHO_REF_ID;
        type = undefined;
        format = undefined;
        reference = {
          schema: {
            $ref: referenceSchema,
          },
        };
      }
      if (format) {
        type = formatToType[format];
      }
      if (type === format) {
        format = undefined;
      }

      invariant(type !== TypeEnum.Ref);
      const values: JsonSchemaType = { $id, type, format, reference, ...rest };
      this._schema.jsonSchema.properties ??= {};
      this._schema.jsonSchema.properties[property] = values;
    }
  }

  /**
   * Delete a field from the view and return the deleted projection for potential undo.
   */
  deleteFieldProjection(property: string): { deleted: FieldProjection; index: number } {
    const current = this.getFieldProjection(property as JsonProp);
    // NOTE(ZaymonFC): We need to clone this because the underlying object is going to be modified.
    const fieldProjection = { field: { ...current.field }, props: { ...current.props } };

    const fieldIndex = this._view.fields.findIndex((field) => field.property === property);
    if (fieldIndex !== -1) {
      this._view.fields.splice(fieldIndex, 1);
    }
    if (this._schema.jsonSchema.properties?.[property]) {
      delete this._schema.jsonSchema.properties[property];
    }

    return { deleted: fieldProjection, index: fieldIndex };
  }
}

const getUniqueProperty = (view: ViewType): JsonProp => {
  let n = 1;
  while (true) {
    const property: JsonProp = `prop_${n++}` as JsonProp;
    const idx = view.fields.findIndex((field) => field.property === property);
    if (idx === -1) {
      return property;
    }
  }
};
