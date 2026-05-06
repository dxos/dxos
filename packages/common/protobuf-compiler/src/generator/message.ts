//
// Copyright 2020 DXOS.org
//

import { dirname, relative, sep } from 'path';
import type * as protobufjs from 'protobufjs';
import * as ts from 'typescript';

import { type GeneratorContext } from './context';
import { attachDocComment } from './doc-comment';
import { getFieldType } from './field';

const f = ts.factory;

/**
 * Types whose generated interface should be replaced by a re-export from
 * `@bufbuild/protobuf/wkt`. Lets `@dxos/codec-protobuf` and `@dxos/rpc` share
 * the same `Any` shape and skip wire-format adapters at the RPC layer.
 */
const BUFBUILD_WKT_REEXPORTS: Record<string, string> = {
  '.google.protobuf.Any': 'Any',
};

/**
 * {@link file://./../configure.ts#l5}
 */
export const createMessageDeclaration = (type: protobufjs.Type, ctx: GeneratorContext) => {
  // Special case: emit `export type { Any } from '@bufbuild/protobuf/wkt';`
  // instead of a fresh interface so codec-protobuf-substituted Any matches the
  // bufbuild static type used elsewhere.
  const reexportName = BUFBUILD_WKT_REEXPORTS[type.fullName];
  if (reexportName) {
    return f.createExportDeclaration(
      undefined,
      true, // type-only
      f.createNamedExports([f.createExportSpecifier(false, undefined, f.createIdentifier(reexportName))]),
      f.createStringLiteral('@bufbuild/protobuf/wkt'),
    );
  }

  const declaration = f.createInterfaceDeclaration(
    [f.createToken(ts.SyntaxKind.ExportKeyword)],
    type.name,
    undefined,
    undefined,
    type.fieldsArray.map((field) => {
      const isRequired =
        field.required || (!field.getOption('proto3_optional') && !field.repeated && !field.map && !field.partOf);

      const signature = f.createPropertySignature(
        undefined,
        field.name.includes('.') ? f.createStringLiteral(field.name) : field.name,
        isRequired ? undefined : f.createToken(ts.SyntaxKind.QuestionToken),
        getFieldType(field, ctx.subs),
      );

      const docComment = getFieldDocComment(field);
      return docComment ? attachDocComment(signature, docComment) : signature;
    }),
  );

  const commentSections = type.comment ? [type.comment] : [];
  if (type.filename) {
    commentSections.push(
      `Defined in: \`${relative(dirname(ctx.outputFilename), type.filename).split(sep).join('/')}\``,
    );
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
    sections.push(
      'Options:\n' +
      Object.entries(field.options)
        .map(([key, value]) => `  - ${key} = ${JSON.stringify(value)}`)
        .join('\n'),
    );
  }

  if (sections.length === 0) {
    return undefined;
  } else {
    return sections.join('\n\n');
  }
};
