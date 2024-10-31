//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/effect';
import { QueryType, JsonSchemaType, FieldMeta } from '@dxos/echo-schema';

// TODO(burdon): JSON path alternatives.
//  - https://datatracker.ietf.org/doc/html/rfc6901
//  - https://blog.json-everything.net/posts/paths-and-pointers
// Schema refs:
//  - https://json-schema.org/understanding-json-schema/structuring#dollarref

//
// Fields
//

// TODO(burdon): Reconcile with echo-schema/PropType... (which uses enum integers).
//  PropType = low-level primitives.
//  FieldValueType = higher-level "kind".
//  { type: 'number', kind: 'percent' }
export enum FieldValueType {
  // Effect schema.
  String = 'string',
  Boolean = 'boolean',
  Number = 'number',

  // Primitives from echo-schema.
  Ref = 'ref',

  // Arrays/Maps/Enum?
  User = 'user',
  Text = 'text',
  JSON = 'json',
  Timestamp = 'timestamp',
  DateTime = 'datetime',
  Date = 'date',
  Time = 'time',

  // Kind.
  Percent = 'percent',
  Currency = 'currency',
  Formula = 'formula',
  Email = 'email',
  URL = 'url',
  DID = 'did',

  // TODO(burdon): Other types:
  //  - Duration, Rating
  //  - Address, Phone number
}

export const FieldValueTypes = Object.values(FieldValueType).sort();

// TODO(burdon): Is a View just a S.Struct overlay (with additional refinements)?
//  ISSUE: We only persist schema as JSONSchema which has concurency issues.
// TODO(burdon): Single/multi-select enums?
// If num digits was an annotation could we update the number of digits.
// TODO(dmaretskyi): Remove.
/**
 * @deprecated
 */
export const FieldSchema = S.mutable(
  S.Struct({
    id: S.String,
    path: S.String,

    // TODO(burdon): Replace with annotations?
    type: S.Enums(FieldValueType),
    digits: S.optional(S.Number), // TODO(burdon): Presentational vs. type precision.

    // UX concerns.
    label: S.optional(S.String),
    // TODO(burdon): Table/Form-specific layout, or keep generic?
    size: S.optional(S.Number),
  }),
);

export type FieldType = S.Schema.Type<typeof FieldSchema>;

//
// View
//

/**
 * Views are generated or user-defined projections of a schema's properties.
 * They are used to configure the visual representation of the data.
 * The query is separate from the view (queries configure the projection of data objects).
 */
export const ViewSchema = S.Struct({
  query: QueryType,
  schema: JsonSchemaType,
});

export type ViewType = S.Schema.Type<typeof ViewSchema>;

/**
 * Annotation to set field kind.
 */
// TODO(dmaretskyi): Rename `KindAnnotation`.
export const FieldKind = (kind: FieldValueType) => FieldMeta('dxos.schema', { kind });

/**
 * Annotation to set column size.
 */
export const ColumnSize = (size: number) => FieldMeta('dxos.view', { size });


export const setColumnSize = (schema: JsonSchemaType, property: string, size: number): void =>
  setAnnotation(schema, property, 'dxos.view', { size });

/**
 * https://www.ietf.org/archive/id/draft-goessner-dispatch-jsonpath-00.html
 * @example $.name
 */
export type JsonPath = string & { __JsonPath: true };

/**
 * Sets the dViewPathe for the field.
 * @param dataSource Data source path in the json path format. This is the field path in the source object.
 */
export const ViewPath = (path: JsonPath) => FieldMeta('dxos.view', { path });


//
// New stuff
//


export const createEmptySchema = (typename: string, version: string): ReactiveObject<StoredSchema> =>
  create(StoredSchema, {
    typename,
    version,
    jsonSchema: effectToJsonSchema(S.Struct({})),
  });

  export const setProperty = (schema: JsonSchemaType, field: string, type: S.Schema.Any): void => {
  const jsonSchema = effectToJsonSchema(type as S.Schema<any>);
  delete jsonSchema.$schema; // Remove $schema on leaf nodes.
  (schema as any).properties ??= {};
  (schema as any).properties[field] = jsonSchema;
};

export const dynamicRef = (obj: StoredSchema): S.Schema.Any =>
  S.Any.annotations({
    [ReferenceAnnotationId]: {
      schemaId: obj.id,
      typename: obj.typename,
      version: obj.version,
    } satisfies ReferenceAnnotationValue,
  });

  export const setAnnotation = (schema: JsonSchemaType, property: string, annotation: string, value: any): void => {
  (schema as any).properties[property].$echo ??= {};
  (schema as any).properties[property].$echo.annotations ??= {};
  (schema as any).properties[property].$echo.annotations[annotation] ??= {};
  Object.assign((schema as any).properties[property].$echo.annotations[annotation], value);
};
