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

// TODO(burdon): Is a View just a S.Struct overlay (with additional refinements)?
//  ISSUE: We only persist schema as JSONSchema which has concurency issues.
// TODO(burdon): Single/multi-select enums?
// If num digits was an annotation could we update the number of digits.
export const FieldSchema = S.mutable(
  S.Struct({
    // TODO(ZaymonFC): Should validations be common? Think about translations?
    path: S.String.pipe(
      S.nonEmptyString({ message: () => 'Property is required.' }),
      S.pattern(/^[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*$/, { message: () => 'Invalid property path.' }),
    ),

    // TODO(burdon): Replace with annotations?
    type: S.Enums(FieldValueType),

    // UX concerns.
    label: S.optional(S.String),
    size: S.optional(S.Number.pipe(S.int(), S.nonNegative())),

    /** Default value for new records. */
    defaultValue: S.optional(S.Any),

    /** Number of decimal digits. */
    digits: S.optional(S.Number.pipe(S.int(), S.nonNegative())),
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
