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

// TODO(burdon): Reconcile with echo-schema/PropType... (which uses enum integers).
//  PropType = low-level primitives.
//  FieldValueType = higher-level "kind".
//  { type: 'number', kind: 'percent' }
export enum FieldValueType {
  String = 'string',

  Boolean = 'boolean',

  Number = 'number',
  Percent = 'percent',
  Currency = 'currency',

  Text = 'text',
  Ref = 'ref',
  User = 'user',

  JSON = 'json',

  Timestamp = 'timestamp',
  DateTime = 'datetime',
  Date = 'date',
  Time = 'time',

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

// TODO(burdon): ECHO Query DSL?
export const QuerySchema = S.Struct({
  // TODO(burdon): Schema DXN annotation.
  schema: S.String,
});

// TODO(burdon): Are views always flat projections?
export const ViewSchema = S.Struct({
  query: S.optional(QuerySchema),
  fields: S.mutable(S.Array(FieldSchema)),
});

export type ViewType = S.Schema.Type<typeof ViewSchema>;
