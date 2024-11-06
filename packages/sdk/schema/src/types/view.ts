//
// Copyright 2024 DXOS.org
//

import {
  create,
  JsonPath,
  type JSONSchema,
  JsonSchemaType,
  type MutableSchema,
  QueryType,
  type ReactiveObject,
  S,
  TypedObject,
} from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { PropertySchema, type PropertyType } from './format';

/**
 * Stored field metadata (e.g., for UX).
 */
export const FieldSchema = S.Struct({
  // TODO(burdon): Property or path?
  property: S.String,
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
    fields: properties.map((property) => ({ property })),
  });
};

// TODO(burdon): Field and Format are in different namespaces so we ideally shouldn't merge here.
export const FieldProjectionSchema = S.extend(FieldSchema, PropertySchema);

export type FieldProjectionType = S.Schema.Type<typeof FieldProjectionSchema>;

/**
 * Wrapper for View that manages Field and Format updates.
 */
// TODO(burdon): Form values adapter for ViewEditor (schema).
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
  // TODO(burdon): Map ref to $id/ref. Custom selector.
  getFieldProjection(property: string): FieldProjectionType {
    const field = this._view.fields.find((f) => f.property === property) ?? { property };
    const properties = this._schema.jsonSchema.properties![property] as JsonSchemaType;
    log.info('getFieldProjection', { field, properties });
    return { ...field, ...properties };
  }

  /**
   * Update View field properties.
   */
  updateField = (value: FieldType): FieldType => {
    log.info('updateField', { value });
    let field = this._view.fields.find((f) => f.property === value.property);
    if (field) {
      Object.assign(field, value);
    } else {
      field = { ...value };
      this._view.fields.push(field);
    }

    return field;
  };

  /**
   * Update JSON schema property annotations.
   */
  // TODO(burdon): Use schema annotations to determine how to map onto JsonSchema property object.
  updateProperties(property: string, values: Partial<PropertyType>): PropertyType {
    log.info('updateProperties', { property, values });
    const { property: _, ...rest } = values;
    let properties: JSONSchema.JsonSchema7 | undefined = this._schema.jsonSchema.properties![property];
    if (properties) {
      // TODO(burdon): Delete existing?
      Object.assign(properties, rest);
    } else {
      properties = { ...rest } as JSONSchema.JsonSchema7;
      this._schema.jsonSchema.properties![property] = properties;
    }

    return properties as PropertyType;
  }
}
