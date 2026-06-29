//
// Copyright 2020 DXOS.org
//

import type protobufjs from 'protobufjs';
import * as ts from 'typescript';

import { compressSchema } from '@dxos/codec-protobuf';

import { CODEC_MODULE, type ModuleSpecifier } from '../module-specifier';
import { serializeSchemaToJson } from '../protobuf-json';

const f = ts.factory;

export const createSerializerDefinition = (
  substitutionsModule: ModuleSpecifier | undefined,
  root: protobufjs.Root,
  outFileDir: string,
  compress: boolean,
): { imports: ts.Statement[]; exports: ts.Statement[] } => {
  const schemaIdentifier = f.createIdentifier('Schema');
  const decompressIdentifier = f.createIdentifier('decompressSchema');

  const schemaImport = f.createImportDeclaration(
    [],
    f.createImportClause(
      false,
      undefined,
      f.createNamedImports(
        [
          f.createImportSpecifier(false, undefined, schemaIdentifier),
          compress && f.createImportSpecifier(false, undefined, decompressIdentifier),
        ].filter(Boolean) as ts.ImportSpecifier[],
      ),
    ),
    f.createStringLiteral(CODEC_MODULE.importSpecifier(outFileDir)),
  );

  const substitutionsIdentifier = f.createIdentifier('substitutions');

  const schemaJsonIdentifier = f.createIdentifier('schemaJson');
  const schemaJsonExport = f.createVariableStatement(
    [f.createToken(ts.SyntaxKind.ExportKeyword)],
    f.createVariableDeclarationList(
      [
        f.createVariableDeclaration(
          schemaJsonIdentifier,
          undefined,
          undefined,
          compress
            ? f.createCallExpression(decompressIdentifier, undefined, [
                f.createCallExpression(
                  f.createPropertyAccessExpression(f.createIdentifier('JSON'), 'parse'),
                  undefined,
                  [f.createStringLiteral(JSON.stringify(compressSchema(serializeSchemaToJson(root))))],
                ),
              ])
            : f.createCallExpression(f.createPropertyAccessExpression(f.createIdentifier('JSON'), 'parse'), undefined, [
                f.createStringLiteral(JSON.stringify(serializeSchemaToJson(root))),
              ]),
        ),
      ],
      ts.NodeFlags.Const,
    ),
  );

  const schemaExport = f.createVariableStatement(
    [f.createToken(ts.SyntaxKind.ExportKeyword)],
    f.createVariableDeclarationList(
      [
        f.createVariableDeclaration(
          f.createIdentifier('schema'),
          undefined,
          undefined,
          f.createCallExpression(
            f.createPropertyAccessExpression(schemaIdentifier, 'fromJson'),
            [f.createTypeReferenceNode('TYPES'), f.createTypeReferenceNode('SERVICES')],
            substitutionsModule ? [schemaJsonIdentifier, substitutionsIdentifier] : [schemaJsonIdentifier],
          ),
        ),
      ],
      ts.NodeFlags.Const,
    ),
  );

  return {
    imports: [schemaImport],
    exports: [schemaJsonExport, schemaExport],
  };
};
