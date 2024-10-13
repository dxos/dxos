//
// Copyright 2024 DXOS.org
//

import jp from 'jsonpath';

import { AST, S } from '@dxos/effect';

//
// Field
//

export const isScalar = (p: AST.AST) => AST.isNumberKeyword(p) || AST.isBooleanKeyword(p) || AST.isStringKeyword(p);

// TODO(burdon): Format vs. type?
// TODO(burdon): String or numeric enum value.
export enum FieldScalarType {
  Number = 'number',
  Boolean = 'boolean',
  String = 'string',

  Ref = 'ref',

  // TODO(burdon): Distinguish scalar types by decorated types.
  Percent = 'percent',
  // TODO(burdon): Currency type.
  Currency = 'currency',

  DateTime = 'datetime',
  Date = 'date',
  Time = 'time',

  // TODO(burdon): Other types:
  //  - URL
  //  - DID
}

// TODO(burdon): Single/multi-select enums?

// TODO(burdon): Is S.mutable required?
export const FieldSchema = S.mutable(
  S.Struct({
    path: S.String,
    type: S.Enums(FieldScalarType),

    label: S.optional(S.String),

    /** Number of decimal digits. */
    digits: S.optional(S.Number),

    /** Default value for new records. */
    defaultValue: S.optional(S.Any),

    // TODO(burdon): Table specific, generic or union?
    size: S.optional(S.Number),
  }),
);

export type FieldType = S.Schema.Type<typeof FieldSchema>;

//
// View
//

// TODO(burdon): Different type for Form/Table or common type?
export const ViewSchema = S.Struct({
  schema: S.Any, // TODO(burdon): Serialized as FQ typename.
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
