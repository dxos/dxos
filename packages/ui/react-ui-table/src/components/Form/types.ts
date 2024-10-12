//
// Copyright 2024 DXOS.org
//

import jp from 'jsonpath';

import { AST, S } from '@dxos/effect';

// TODO(burdon): FieldSchema for Form also.
export const FieldSchema = S.Struct({
  path: S.String,
  label: S.optional(S.String),
  defaultValue: S.optional(S.Any),

  // Table specific, generic or union?
  size: S.optional(S.Number),
});

export type FieldType = S.Schema.Type<typeof FieldSchema>;

export const TableSchema = S.Struct({
  schema: S.Any, // TODO(burdon): Serialized as typename.
  columns: S.Array(FieldSchema),
});

export type TableType = S.Schema.Type<typeof TableSchema>;

// TODO(burdon): Just use lodash.get?
export const getColumnValue = <T>(data: any, field: FieldType, defaultValue?: T): T =>
  jp.value(data, '$.' + field.path) as T;

// TODO(burdon): Determine if path can be written back.
export const setColumnValue = <T>(data: any, field: FieldType, value: T): T => jp.value(data, '$.' + field.path, value);

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
      const n = prop.type.types.find((p) => AST.isTypeLiteral(p));
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
