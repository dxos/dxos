//
// Copyright 2020 DXOS.org
//

import * as ts from '@typescript/typescript6';
import { dirname, relative } from 'path';
import type * as protobufjs from 'protobufjs';

import { type GeneratorContext } from './context.ts';
import { attachDocComment } from './doc-comment.ts';

const f = ts.factory;

export const createEnumDeclaration = (type: protobufjs.Enum, ctx: GeneratorContext) => {
  const declaration = f.createEnumDeclaration(
    [f.createToken(ts.SyntaxKind.ExportKeyword)],
    type.name,
    Object.entries(type.values).map(([name, id]) => f.createEnumMember(name, f.createNumericLiteral(id))),
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
