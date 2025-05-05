//
// Copyright 2020 DXOS.org
//

import pb from 'protobufjs';
import * as ts from 'typescript';

import { invariant } from '@dxos/invariant';

import { types } from './types';
import { type SubstitutionsMap } from '../parser';

const f = ts.factory;

export const getFieldType = (field: pb.Field, subs: SubstitutionsMap): ts.TypeNode => {
  if (field.repeated) {
    return f.createArrayTypeNode(getScalarFieldType(field, subs));
  } else if (field.map && field instanceof pb.MapField) {
    return f.createTypeReferenceNode('Partial', [
      f.createTypeReferenceNode('Record', [
        f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        getScalarFieldType(field, subs),
      ]),
    ]);
  } else {
    return getScalarFieldType(field, subs);
  }
};

export const getScalarFieldType = (field: pb.Field, subs: SubstitutionsMap): ts.TypeNode => {
  invariant(field.message);
  field.resolve();
  return types(field.resolvedType ?? field.type, field.message, subs);
};
