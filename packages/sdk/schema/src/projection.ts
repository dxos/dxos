//
// Copyright 2024 DXOS.org
//

import {
  formatToType,
  typeToFormat,
  FormatEnum,
  type JsonProp,
  type MutableSchema,
  S,
  TypeEnum,
  type JsonSchemaType,
} from '@dxos/echo-schema';
import { getSchemaReference, createSchemaReference } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { omit, pick } from '@dxos/util';

import { PropertySchema, type PropertyType } from './format';
import { type ViewType, type FieldType } from './view';

export const VIEW_FIELD_LIMIT = 32;

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
    // TODO(burdon): How to use tables with static schema.
    private readonly _schema: MutableSchema,
    private readonly _view: ViewType,
  ) {}

  get view() {
    return this._view;
  }

  /**
   * Construct a new property.
   */
  createFieldProjection(): FieldType {
    invariant(this._view.fields.length < VIEW_FIELD_LIMIT, `Field limit reached: ${VIEW_FIELD_LIMIT}`);

    const field: FieldType = {
      id: createFieldId(),
      path: createUniqueProperty(this._view),
    };

    log('createFieldProjection', { field });
    this._view.fields.push(field);
    return field;
  }

  getFieldId(path: string): string | undefined {
    return this._view.fields.find((field) => field.path === path)?.id;
  }

  /**
   * Get projection of View fields and JSON schema property annotations.
   */
  getFieldProjection(fieldId: string): FieldProjection {
    invariant(this._schema.jsonSchema.properties);
    const field = this._view.fields.find((f) => f.id === fieldId);
    invariant(field, `invalid field: ${fieldId}`);
    invariant(field.path.indexOf('.') === -1);

    const jsonProperty: JsonSchemaType = this._schema.jsonSchema.properties[field.path] ?? { format: FormatEnum.None };
    const { type: schemaType, format: schemaFormat = FormatEnum.None, ...rest } = jsonProperty;
    const referenceSchema = getSchemaReference(jsonProperty);

    let type: TypeEnum = schemaType as TypeEnum;
    let format: FormatEnum = schemaFormat as FormatEnum;
    if (referenceSchema) {
      type = TypeEnum.Ref;
      format = FormatEnum.Ref;
    } else if (format === FormatEnum.None) {
      format = typeToFormat[type as TypeEnum]!;
    }

    const values = {
      type,
      format,
      property: field.path as JsonProp,
      referenceSchema,
      referencePath: field.referencePath,
      ...rest,
    };

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
    log('setFieldProjection', { field, props, index });

    const sourcePropertyName = field?.path;
    const targetPropertyName = props?.property;
    const isRename = !!(sourcePropertyName && targetPropertyName && targetPropertyName !== sourcePropertyName);

    // TODO(burdon): Set field if does not exist.
    if (field) {
      const propsValues = props ? (pick(props, ['referencePath']) as Partial<FieldType>) : undefined;
      const clonedField: FieldType = { ...field, ...propsValues };
      const fieldIndex = this._view.fields.findIndex((field) => field.path === sourcePropertyName);
      if (fieldIndex === -1) {
        invariant(this._view.fields.length < VIEW_FIELD_LIMIT, `Field limit reached: ${VIEW_FIELD_LIMIT}`);
        if (index !== undefined && index >= 0 && index <= this._view.fields.length) {
          this._view.fields.splice(index, 0, clonedField);
        } else {
          this._view.fields.push(clonedField);
        }
      } else {
        Object.assign(this._view.fields[fieldIndex], clonedField, isRename ? { path: targetPropertyName } : undefined);
      }
    }

    if (props) {
      let { property, type, format, referenceSchema, ...rest }: Partial<PropertyType> = this._encode(
        omit(props, ['referencePath']),
      );
      invariant(property);
      invariant(format);

      const jsonProperty: JsonSchemaType = {};
      if (referenceSchema) {
        Object.assign(jsonProperty, createSchemaReference(referenceSchema));
        type = undefined;
        format = undefined;
      } else if (format) {
        type = formatToType[format];
      }

      invariant(type !== TypeEnum.Ref);
      this._schema.jsonSchema.properties ??= {};
      this._schema.jsonSchema.properties[property] = { type, format, ...jsonProperty, ...rest };
      if (isRename) {
        delete this._schema.jsonSchema.properties[sourcePropertyName!];
      }
    }
  }

  /**
   * Delete a field from the view and return the deleted projection for potential undo.
   */
  deleteFieldProjection(fieldId: string): { deleted: FieldProjection; index: number } {
    // NOTE(ZaymonFC): We need to clone this because the underlying object is going to be modified.
    const current = this.getFieldProjection(fieldId);
    const fieldProjection = { field: { ...current.field }, props: { ...current.props } };

    // Delete field.
    const fieldIndex = this._view.fields.findIndex((field) => field.id === fieldId);
    if (fieldIndex !== -1) {
      this._view.fields.splice(fieldIndex, 1);
    }

    // Delete property.
    delete this._schema.jsonSchema.properties?.[current?.field.path];

    return { deleted: fieldProjection, index: fieldIndex };
  }
}

export const createFieldId = () => PublicKey.random().truncate();

export const createUniqueProperty = (view: ViewType): JsonProp => {
  let n = 1;
  while (true) {
    const property: JsonProp = `prop_${n++}` as JsonProp;
    const idx = view.fields.findIndex((field) => field.path === property);
    if (idx === -1) {
      return property;
    }
  }
};
