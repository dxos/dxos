//
// Copyright 2024 DXOS.org
//

import {
  JSON_SCHEMA_ECHO_REF_ID,
  formatToType,
  typeToFormat,
  FormatEnum,
  type JsonProp,
  type JsonSchemaType,
  type MutableSchema,
  S,
  TypeEnum,
  type JsonPath,
} from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { getDeep, omit, pick, setDeep } from '@dxos/util';

import { PropertySchema, type PropertyType } from './format';
import { type ViewType, type FieldType } from './view';

const DXN = /dxn:type:(.+)/;

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
// TODO(burdon): Unit tests.
// TODO(burdon): In the future the path could be an actual path (not property).
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
    const field: FieldType = {
      id: createFieldId(), // TODO(burdon): Check unique.
      path: createUniqueProperty(this._view),
    };

    log('createFieldProjection', { field });
    this._view.fields.push(field);
    return field;
  }

  /**
   * Get projection of View fields and JSON schema property annotations.
   */
  getFieldProjection(fieldId: string): FieldProjection {
    invariant(this._schema.jsonSchema.properties);
    const field = this._view.fields.find((f) => f.id === fieldId);
    invariant(field, `invalid field: ${fieldId}`);
    invariant(field.path.indexOf('.') === -1); // TODO(burdon): Paths not currently supported.

    const {
      $id,
      type: schemaType,
      format: schemaFormat = FormatEnum.None,
      reference,
      ...rest
    } = this._schema.jsonSchema.properties[field.path] ?? {
      format: FormatEnum.None,
    };

    let type: TypeEnum = schemaType as TypeEnum;
    let format: FormatEnum = schemaFormat as FormatEnum;

    // Map reference.
    let referenceSchema: string | undefined;
    if ($id && reference) {
      type = TypeEnum.Ref;
      format = FormatEnum.Ref;
      const match = reference.schema.$ref?.match(DXN);
      if (match) {
        referenceSchema = match[1];
      }
    }
    if (format === FormatEnum.None) {
      format = typeToFormat[type as TypeEnum]!;
    }

    const values = { property: field.path as JsonProp, type, format, referenceSchema, ...rest };
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

    // TODO(burdon): Just setting a prop should create a field if missing.
    const sourcePropertyName = field?.path;
    const targetPropertyName = props?.property;
    const isRename = !!(sourcePropertyName && targetPropertyName && targetPropertyName !== sourcePropertyName);

    if (field) {
      const clonedField: FieldType = { ...field, ...pick(field, ['referencePath']) };
      const fieldIndex = this._view.fields.findIndex((f) => f.path === sourcePropertyName);
      if (fieldIndex === -1) {
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
      let {
        property,
        type,
        format,
        referenceSchema,
        referencePath: _, // Strip.
        ...rest
      }: Partial<PropertyType> = this._encode(omit(props, ['referencePath']));
      invariant(property);
      invariant(format);

      if (isRename) {
        delete this._schema.jsonSchema.properties![sourcePropertyName!];
      }

      let $id;
      let reference;
      if (referenceSchema) {
        $id = JSON_SCHEMA_ECHO_REF_ID;
        type = undefined;
        format = undefined;
        reference = {
          schema: {
            $ref: `dxn:type:${referenceSchema}`,
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

// TODO(burdon): Move to echo-schema.
export const getValue = <T = any>(obj: any, path: JsonPath) => getDeep<T>(obj, path.split('.'));
export const setValue = <T = any>(obj: any, path: JsonPath, value: T) => setDeep<T>(obj, path.split('.'), value);
