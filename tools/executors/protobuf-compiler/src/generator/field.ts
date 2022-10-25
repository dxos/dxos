//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';
import * as protobufjs from 'protobufjs';
import * as ts from 'typescript';

import { SubstitutionsMap } from '../parser';
import { types } from './types';

const f = ts.factory;

export const getFieldType = (
  field: protobufjs.Field,
  subs: SubstitutionsMap
): ts.TypeNode => {
  if (field.repeated) {
    return f.createArrayTypeNode(getScalarFieldType(field, subs));
  } else if (field.map && field instanceof protobufjs.MapField) {
    return f.createTypeReferenceNode('Partial', [
      f.createTypeReferenceNode('Record', [
        f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        getScalarFieldType(field, subs)
      ])
    ]);
  } else {
    return getScalarFieldType(field, subs);
  }
};

export const getScalarFieldType = (
  field: protobufjs.Field,
  subs: SubstitutionsMap
): ts.TypeNode => {
  assert(field.message);
  field.resolve();
  return types(field.resolvedType ?? field.type, field.message, subs);
};
