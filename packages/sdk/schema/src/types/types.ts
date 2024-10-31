//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/effect';

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

// TODO(burdon): ECHO Query DSL.
export const QuerySchema = S.Struct({
  // TODO(burdon): Schema DXN annotation.
  schema: S.String,
});

/**
 * Views are generated or user-defined projections of a schema's properties.
 * They are used to configure the visual representation of the data.
 * The query is separate from the view (queries configure the projection of data objects).
 */
export const ViewSchema = S.Struct({
  // TODO(burdon): Schema DXN annotation.
  schema: S.String,
  fields: S.mutable(S.Array(FieldSchema)),
});

export type ViewType = S.Schema.Type<typeof ViewSchema>;
