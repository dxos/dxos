//
// Copyright 2024 DXOS.org
//

import jp from 'jsonpath';

import { AST, S } from '@dxos/effect';

export const isScalar = (ast: AST.AST) =>
  AST.isNumberKeyword(ast) || AST.isBooleanKeyword(ast) || AST.isStringKeyword(ast);

// TODO(burdon): Move to core @dxos/types?

// TODO(burdon): JSON path
//  - https://datatracker.ietf.org/doc/html/rfc6901
//  - https://blog.json-everything.net/posts/paths-and-pointers

//
// Field
//

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

// TODO(burdon): Add string format.
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

//
// Utils
//

// TODO(burdon): Just use lodash.get?
export const getFieldValue = <T>(data: any, field: FieldType, defaultValue?: T): T | undefined =>
  (jp.value(data, '$.' + field.path) as T) ?? defaultValue;

// TODO(burdon): Determine if path can be written back (or is a compute value).
export const setFieldValue = <T>(data: any, field: FieldType, value: T): T => jp.value(data, '$.' + field.path, value);

// TODO(burdon): Check unique name against schema.
export const getUniqueProperty = (view: ViewType) => {
  let n = 1;
  while (true) {
    const path = `prop_${n++}`;
    const idx = view.fields.findIndex((field) => field.path === path);
    if (idx === -1) {
      return path;
    }
  }
};

/**
 * Get the AST node associated with the field.
 */
export const getProperty = (schema: S.Schema<any>, field: FieldType): AST.AST | undefined => {
  let node: AST.AST = schema.ast;
  const parts = field.path.split('.');
  for (const part of parts) {
    const props = AST.getPropertySignatures(node);
    const prop = props.find((prop) => prop.name === part);
    if (!prop) {
      return undefined;
    }

    if (AST.isUnion(prop.type)) {
      const n = prop.type.types.find((p) => isScalar(p) || AST.isTypeLiteral(p));
      if (!n) {
        return undefined;
      }
      node = n;
    } else {
      node = prop.type;
    }
  }

  return node;
};
