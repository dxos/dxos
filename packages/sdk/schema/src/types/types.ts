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

// TODO(dmaretskyi): Remove.
export const FieldValueTypes = Object.values(FieldValueType).sort();

// TODO(dmaretskyi): Remove.
export const FieldSchema = S.mutable(
  S.Struct({
    id: S.String,
    path: S.String,
    // TODO(burdon): Single/multi-select enums?
    type: S.Enums(FieldValueType),
    label: S.optional(S.String),

    /** Default value for new records. */
    defaultValue: S.optional(S.Any),

    /** Number of decimal digits. */
    digits: S.optional(S.Number),

    // TODO(burdon): Table/Form-specific layout, or keep generic?
    size: S.optional(S.Number),

    // TODO(burdon): Add format/template string (e.g., time format).
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
export const FieldKind = (kind: FieldValueType) => FieldMeta('dxos.schema', { kind });

/**
 * Annotation to set column size.
 */
export const ColumnSize = (size: number) => FieldMeta('dxos.view', { size });

/**
 * https://www.ietf.org/archive/id/draft-goessner-dispatch-jsonpath-00.html
 * @example $.name
 */
export type JsonPath = string & { __JsonPath: true };

/**
 * Sets the data source for the field.
 * @param dataSource Data source path in the json path format. This is the field path in the source object.
 */
export const DataSource = (dataSource: JsonPath) => FieldMeta('dxos.view', { dataSource });
