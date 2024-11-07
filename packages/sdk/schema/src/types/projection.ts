//
// Copyright 2024 DXOS.org
//

import {
  JSON_SCHEMA_ECHO_REF_ID,
  createJsonPath,
  FormatEnum,
  type JsonSchemaType,
  type MutableSchema,
  S,
  ScalarEnum,
  type JsonPath,
} from '@dxos/echo-schema';
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
  createProperty(): FieldProjection {
    const prop = getUniqueProperty(this._view);

    const field: FieldType = {
      property: prop,
    };

    const props: PropertyType = {
      property: prop,
      format: FormatEnum.None,
    };

    this._view.fields.push(field);
    this._schema.jsonSchema.properties![prop] = props;
    return { field, props };
  }

  /**
   * Get projection of View fields and JSON schema property annotations.
   */
  // TODO(burdon): JsonProp.
  // TODO(burdon): Rename property to match create.
  getFieldProjection(prop: string): FieldProjection {
    let {
      $id,
      type,
      format = FormatEnum.None,
      reference,
      ...rest
    } = this._schema.jsonSchema.properties![prop] ?? { property: prop, format: FormatEnum.None };

    // Map reference.
    let referenceSchema: string | undefined;
    if ($id && reference) {
      type = ScalarEnum.Ref;
      format = FormatEnum.Ref;
      referenceSchema = reference.schema.$ref;
    }
    if (!format) {
      format = type;
    }

    const field: FieldType = this._view.fields.find((f) => f.property === prop) ?? { property: createJsonPath(prop) };
    const values = { property: prop, type, format, referenceSchema, ...rest };
    const props = this._decode(values);
    log.info('getFieldProjection', { field, props });
    return { field, props };
  }

  /**
   * Update JSON schema property annotations.
   */
  setFieldProjection({ field, props }: Partial<FieldProjection>) {
    log.info('setFieldProjection', { field, props });

    if (field) {
      const current = this._view.fields.find((f) => f.property === field.property);
      if (!current) {
        this._view.fields.push({ ...field });
      } else {
        // TODO(burdon): Overwrite?
        Object.assign(current, field);
      }
    }

    if (props) {
      let { property, type, format, referenceSchema, ...rest } = this._encode(props);

      // Set reference.
      // TODO(burdon): Types?
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
      if (type === format) {
        format = undefined;
      }

      // TODO(burdon): Strip undefined.
      const values: JsonSchemaType = { $id, type, format, reference, ...rest };
      this._schema.jsonSchema.properties![property] = values;
    }
  }
}

// TODO(burdon): Check unique name against schema.
// TODO(dmaretskyi): Not json-path anymore.
const getUniqueProperty = (view: ViewType): JsonPath => {
  let n = 1;
  while (true) {
    const property = `prop_${n++}`;
    const idx = view.fields.findIndex((field) => field.property === property);
    if (idx === -1) {
      return createJsonPath(property);
    }
  }
};
