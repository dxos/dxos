//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { QueryAST } from '@dxos/echo';
import { Format, TypeEnum } from '@dxos/echo/internal';
import { visit } from '@dxos/effect';
import { DXN } from '@dxos/keys';

/**
 * @deprecated
 */
export type SchemaFieldDescription = {
  property: string;
  type: TypeEnum;
  format?: Format.TypeFormat;
};

/**
 * @deprecated
 */
export const mapSchemaToFields = (schema: Schema.Schema<any, any>): SchemaFieldDescription[] => {
  const fields = [] as SchemaFieldDescription[];
  visit(schema.ast, (node, path) => {
    const { type, format } = toFieldValueType(node);
    fields.push({ property: path.join('.'), type, format });
  });

  return fields;
};

/**
 * @deprecated
 */
const toFieldValueType = (type: SchemaAST.AST): { format?: Format.TypeFormat; type: TypeEnum } => {
  if (SchemaAST.isTypeLiteral(type)) {
    return { type: TypeEnum.Ref, format: Format.TypeFormat.Ref };
  } else if (SchemaAST.isNumberKeyword(type)) {
    return { type: TypeEnum.Number };
  } else if (SchemaAST.isBooleanKeyword(type)) {
    return { type: TypeEnum.Boolean };
  } else if (SchemaAST.isStringKeyword(type)) {
    return { type: TypeEnum.String };
  }

  if (SchemaAST.isRefinement(type)) {
    return toFieldValueType(type.from);
  }

  // TODO(zan): How should we be thinking about transformations?
  //  See https://effect.website/docs/guides/schema/projections
  //  - Which of these are we storing in the database?
  //  - For types that aren't the 'DateFromString' transformation, should we be using the 'from' or 'to' type?
  if (SchemaAST.isTransformation(type)) {
    const identifier = SchemaAST.getIdentifierAnnotation(type);
    if (identifier._tag === 'Some') {
      if (identifier.value === 'DateFromString') {
        return { type: TypeEnum.String, format: Format.TypeFormat.Date };
      }
    }
  }

  // TODO(burdon): Better fallback?
  return { type: TypeEnum.String, format: Format.TypeFormat.JSON };
};

// TODO(wittjosiah): This needs to be cleaned up.
//   Ideally this should be something like `Query.getTypename`.
//   It should return the typename the query is indexing, regardless or where in the AST it is.
// TODO(burdon): Should return type or undefined not empty string.
// TODO(burdon): What does this actually mean? Queries may be complex (in the future) and have multiple types.
export const getTypenameFromQuery = (query: QueryAST.Query | undefined): string => {
  let typename = '';
  query &&
    QueryAST.visit(query, (node) => {
      if (node?.type !== 'select') {
        return;
      }

      if (node.filter.type !== 'object') {
        return;
      }

      if (!node.filter.typename) {
        return;
      }

      const dxn = DXN.tryParse(node.filter.typename)?.asTypeDXN();
      if (!dxn) {
        return;
      }

      typename = dxn.type;
    });

  return typename;
};
