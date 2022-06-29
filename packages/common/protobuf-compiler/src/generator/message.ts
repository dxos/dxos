//
// Copyright 2020 DXOS.org
//

import * as protobufjs from 'protobufjs';
import * as ts from 'typescript';

import { SubstitutionsMap } from '../parser';
import { attachDocComment } from './doc-comment';
import { getFieldType } from './field';

const f = ts.factory;

export const createMessageDeclaration = (type: protobufjs.Type, subs: SubstitutionsMap) => {
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

      const docComment = getFieldDocComment(field);
      return docComment ? attachDocComment(signature, docComment) : signature;
    })
  );

  if (!type.comment) {
    return declaration;
  }

  return attachDocComment(declaration, type.comment);
};

const getFieldDocComment = (field: protobufjs.Field) => {
  const sections: string[] = [];

  if (field.comment) {
    sections.push(field.comment);
  }

  if (field.options) {
    sections.push('Options:\n' + Object.entries(field.options).map(([key, value]) => `  - ${key} = ${JSON.stringify(value)}`).join('\n'));
  }

  if (sections.length === 0) {
    return undefined;
  } else {
    return sections.join('\n\n');
  }
};
