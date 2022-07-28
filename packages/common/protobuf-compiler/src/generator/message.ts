//
// Copyright 2020 DXOS.org
//

import { dirname, relative } from 'path';
import * as protobufjs from 'protobufjs';
import * as ts from 'typescript';

import { GeneratorContext } from './context';
import { attachDocComment } from './doc-comment';
import { getFieldType } from './field';

const f = ts.factory;

/**
 * {@link file://./../configure.ts#l5}
 */
export const createMessageDeclaration = (type: protobufjs.Type, ctx: GeneratorContext) => {
  const declaration = f.createInterfaceDeclaration(
    undefined,
    [f.createToken(ts.SyntaxKind.ExportKeyword)],
    type.name,
    undefined,
    undefined,
    type.fieldsArray.map(field => {
      const isRequired = field.required || (!field.getOption('proto3_optional') && !field.repeated && !field.map && !field.partOf);

      const signature = f.createPropertySignature(
        undefined,
        field.name.includes('.') ? f.createStringLiteral(field.name) : field.name,
        isRequired ? undefined : f.createToken(ts.SyntaxKind.QuestionToken),
        getFieldType(field, ctx.subs)
      );

      const docComment = getFieldDocComment(field);
      return docComment ? attachDocComment(signature, docComment) : signature;
    })
  );

  const commentSections = type.comment ? [type.comment] : [];
  if (type.filename) {
    commentSections.push(`Defined in:\n  {@link file://./${relative(dirname(ctx.outputFilename), type.filename)}}`);
  }

  if (commentSections.length === 0) {
    return declaration;
  }

  return attachDocComment(declaration, commentSections.join('\n\n'));
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
