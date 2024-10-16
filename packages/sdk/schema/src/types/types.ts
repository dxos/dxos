//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/effect';

// TODO(burdon): JSON path alternatives.
//  - https://datatracker.ietf.org/doc/html/rfc6901
//  - https://blog.json-everything.net/posts/paths-and-pointers

//
// Fields
//

// TODO(burdon): Kind vs. echo-schema PropType.
export enum FieldValueType {
  Number = 'number',
  Boolean = 'boolean',
  String = 'string',
  Text = 'text',

  Ref = 'ref',
  User = 'user',
  Formula = 'formula',

  Timestamp = 'timestamp',
  DateTime = 'datetime',
  Date = 'date',
  Time = 'time',

  Percent = 'percent',
  Currency = 'currency',
  JSON = 'json',

  // TODO(burdon): Other types:
  //  - Email, URL, DID
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

// TODO(burdon): ECHO Query DSL?
export const QuerySchema = S.Struct({
  schema: S.Any, // TODO(burdon): Serialized as FQ typename.
});

// TODO(burdon): Are views always flat projections?
export const ViewSchema = S.Struct({
  query: QuerySchema, // TODO(burdon): Rename projection?
  fields: S.mutable(S.Array(FieldSchema)),
});

export type ViewType = S.Schema.Type<typeof ViewSchema>;
