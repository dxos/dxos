//
// Copyright 2020 DXOS.org
//

import * as protobufjs from 'protobufjs';
import * as ts from 'typescript';

import { SubstitutionsMap } from '../parser';
import { attachDocComment } from './doc-comment';
import { getFieldType } from './field';

const f = ts.factory;

export function createMessageDeclaration (type: protobufjs.Type, subs: SubstitutionsMap) {
  const declaration = f.createInterfaceDeclaration(
    undefined,
    [f.createToken(ts.SyntaxKind.ExportKeyword)],
    type.name,
    undefined,
    undefined,
    type.fieldsArray.map(field => {
      const signature = f.createPropertySignature(
        undefined,
        field.name.includes('.') ? f.createStringLiteral(field.name) : field.name,
        field.required ? undefined : f.createToken(ts.SyntaxKind.QuestionToken),
        getFieldType(field, subs)
      );

      if (!field.comment) {
        return signature;
      }

      return attachDocComment(signature, field.comment);
    })
  );

  if (!type.comment) {
    return declaration;
  }

  return attachDocComment(declaration, type.comment);
}
