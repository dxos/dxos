//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { type QueryAST } from '@dxos/echo';
import { FormatEnum, type JsonSchemaType, TypeEnum } from '@dxos/echo/internal';
import { visit } from '@dxos/effect';
import { DXN } from '@dxos/keys';

/**
 * @deprecated
 */
export type SchemaFieldDescription = {
  property: string;
  type: TypeEnum;
  format?: FormatEnum;
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

const toFieldValueType = (type: SchemaAST.AST): { format?: FormatEnum; type: TypeEnum } => {
  if (SchemaAST.isTypeLiteral(type)) {
    return { type: TypeEnum.Ref, format: FormatEnum.Ref };
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
        return { type: TypeEnum.String, format: FormatEnum.Date };
      }
    }
  }

  // TODO(burdon): Better fallback?
  return { type: TypeEnum.String, format: FormatEnum.JSON };
};

/**
 * Creates or updates echo annotations for SingleSelect options in a JSON Schema property.
 */
export const makeSingleSelectAnnotations = (
  jsonProperty: JsonSchemaType,
  options: Array<{ id: string; title?: string; color?: string }>,
) => {
  jsonProperty.enum = options.map(({ id }) => id);
  jsonProperty.format = FormatEnum.SingleSelect;
  jsonProperty.annotations = {
    meta: {
      singleSelect: {
        options: options.map(({ id, title, color }) => ({ id, title, color })),
      },
    },
  };

  return jsonProperty;
};

/**
 * Creates or updates echo annotations for MultiSelect options in a JSON Schema property.
 */
export const makeMultiSelectAnnotations = (
  jsonProperty: JsonSchemaType,
  options: Array<{ id: string; title?: string; color?: string }>,
) => {
  // TODO(ZaymonFC): Is this how do we encode an array of enums?
  jsonProperty.type = 'object';
  jsonProperty.items = { type: 'string', enum: options.map(({ id }) => id) };
  jsonProperty.format = FormatEnum.MultiSelect;
  jsonProperty.annotations = {
    meta: {
      multiSelect: {
        options: options.map(({ id, title, color }) => ({ id, title, color })),
      },
    },
  };

  return jsonProperty;
};

// TODO(wittjosiah): This needs to be cleaned up.
//   Ideally this should be something like `Query.getTypename` or something like that.
//   It should return the typename the query is indexing on if it is, regardless or where in the AST it is.
export const getTypenameFromQuery = (query: QueryAST.Query | undefined) => {
  if (query?.type !== 'select') {
    return '';
  }

  if (query.filter.type !== 'object') {
    return '';
  }

  if (!query.filter.typename) {
    return '';
  }

  const dxn = DXN.tryParse(query.filter.typename)?.asTypeDXN();
  if (!dxn) {
    return '';
  }

  return dxn.type;
};
