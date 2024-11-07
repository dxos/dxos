//
// Copyright 2024 DXOS.org
//

import {
  create,
  createJsonPath,
  FormatEnum,
  JsonPath,
  JsonSchemaType,
  type MutableSchema,
  QueryType,
  type ReactiveObject,
  S,
  ScalarEnum,
  TypedObject,
} from '@dxos/echo-schema';
import { ECHO_REF_JSON_SCHEMA_ID } from '@dxos/echo-schema/src';
import { log } from '@dxos/log';

import { PropertySchema, type PropertyType } from './format';

/**
 * Stored field metadata (e.g., for UX).
 */
export const FieldSchema = S.Struct({
  // TODO(burdon): Property or path?
  property: JsonPath,
  visible: S.optional(S.Boolean),
  size: S.optional(S.Number),
  referenceProperty: S.optional(JsonPath),
}).pipe(S.mutable);

export type FieldType = S.Schema.Type<typeof FieldSchema>;

/**
 * Views are generated or user-defined projections of a schema's properties.
 * They are used to configure the visual representation of the data.
 * The query is separate from the view (queries configure the projection of data objects).
 *
 * [Table] => [View] => [Schema]:[JsonSchema]
 */
export class ViewType extends TypedObject({
  typename: 'dxos.org/type/View',
  version: '0.1.0',
})({
  /**
   * Query used to retrieve data.
   * This includes the base type that the view schema (above) references.
   * It may include predicates that represent a persistent "drill-down" query.
   */
  query: QueryType,

  /**
   * Optional schema override used to customize the underlying schema.
   */
  schema: S.optional(JsonSchemaType),

  /**
   * UX metadata associated with displayed fields (in table, form, etc.)
   */
  fields: S.mutable(S.Array(FieldSchema)),

  // TODO(burdon): Readonly flag?
  // TODO(burdon): Add array of sort orders (which might be tuples).
}) {}

type CreateViewProps = {
  typename: string;
  jsonSchema?: JsonSchemaType;
  properties?: string[];
};

/**
 * Create view from existing schema.
 */
// TODO(burdon): What is the minimal type that can be passed here that included TypedObjects (i.e., AbstractSchema).
export const createView = ({
  typename,
  jsonSchema,
  properties: _properties,
}: CreateViewProps): ReactiveObject<ViewType> => {
  const properties = _properties ?? Object.keys(jsonSchema?.properties ?? []).filter((p) => p !== 'id');
  return create(ViewType, {
    // schema: jsonSchema,
    // TODO(burdon): Add schema reference?
    query: {
      __typename: typename,
    },
    // Create initial fields.
    fields: properties.map((property) => ({ property: createJsonPath(property) })),
  });
};

// TODO(burdon): Rename.
export type FieldProjectionType = {
  field: FieldType;
  props: PropertyType;
};

/**
 * Wrapper for View that manages Field and Format updates.
 */
export class ViewProjection {
  constructor(
    // TODO(burdon): This could be StoredSchema?
    // TODO(burdon): Consider how to use tables with static schema.
    private readonly _schema: MutableSchema,
    private readonly _view: ViewType,
  ) {}

  /**
   * Get projection of View fields and JSON schema property annotations.
   */
  getFieldProjection(prop: string): FieldProjectionType {
    let { $id, type, format = FormatEnum.None, reference, ...rest } = this._schema.jsonSchema.properties![prop];

    // Map reference.
    let referenceSchema: string | undefined;
    if ($id && reference) {
      type = ScalarEnum.Ref;
      format = FormatEnum.Ref;
      referenceSchema = reference.schema.$ref;
    }

    const field: FieldType = this._view.fields.find((f) => f.property === prop) ?? { property: createJsonPath(prop) };
    const props = S.decodeSync(PropertySchema)({ property: prop, type, format, referenceSchema, ...rest });
    log.info('getFieldProjection', { field, props });
    return { field, props };
  }

  /**
   * Update JSON schema property annotations.
   */
  setFieldProjection({ field, props }: Partial<FieldProjectionType>) {
    log.info('updateProperties', { field, props });

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
      let { property, type, format, referenceSchema, ...rest } = S.encodeSync(PropertySchema)(props);

      // Set reference.
      // TODO(burdon): Types?
      let $id;
      let reference;
      if (referenceSchema) {
        $id = ECHO_REF_JSON_SCHEMA_ID;
        type = undefined;
        format = undefined;
        reference = {
          schema: {
            $ref: referenceSchema,
          },
        };
      }

      // TODO(burdon): Strip undefined.
      const values: JsonSchemaType = { $id, type, format, reference, ...rest };
      this._schema.jsonSchema.properties![property] = values;
    }
  }
}
