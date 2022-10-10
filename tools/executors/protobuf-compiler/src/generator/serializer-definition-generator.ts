//
// Copyright 2020 DXOS.org
//

import {default as protobufjs } from 'protobufjs';
import ts from 'typescript';

import { CODEC_MODULE, ModuleSpecifier } from '../module-specifier.js';
import { serializeSchemaToJson } from '../protobuf-json.js';

const f = ts.factory;

export const createSerializerDefinition = (substitutionsModule: ModuleSpecifier | undefined, root: protobufjs.Root, outFileDir: string): { imports: ts.Statement[], exports: ts.Statement[] } => {
  const schemaIdentifier = f.createIdentifier('Schema');

  const schemaImport = f.createImportDeclaration(
    [],
    [],
    f.createImportClause(false, undefined, f.createNamedImports([
      f.createImportSpecifier(false, undefined, schemaIdentifier)
    ])),
    f.createStringLiteral(CODEC_MODULE.importSpecifier(outFileDir))
  );

  const substitutionsIdentifier = f.createIdentifier('substitutions');

  const schemaJsonIdentifier = f.createIdentifier('schemaJson');
  const schemaJsonExport = f.createVariableStatement(
    [f.createToken(ts.SyntaxKind.ExportKeyword)],
    f.createVariableDeclarationList([
      f.createVariableDeclaration(
        schemaJsonIdentifier,
        undefined,
        undefined,
        f.createCallExpression(
          f.createPropertyAccessExpression(f.createIdentifier('JSON'), 'parse'),
          undefined,
          [f.createStringLiteral(JSON.stringify(serializeSchemaToJson(root)))]
        )
      )
    ], ts.NodeFlags.Const)
  );

  const schemaExport = f.createVariableStatement(
    [f.createToken(ts.SyntaxKind.ExportKeyword)],
    f.createVariableDeclarationList([
      f.createVariableDeclaration(
        f.createIdentifier('schema'),
        undefined,
        undefined,
        f.createCallExpression(
          f.createPropertyAccessExpression(schemaIdentifier, 'fromJson'),
          [f.createTypeReferenceNode('TYPES'), f.createTypeReferenceNode('SERVICES')],
          substitutionsModule ? [schemaJsonIdentifier, substitutionsIdentifier] : [schemaJsonIdentifier]
        )
      )
    ], ts.NodeFlags.Const)
  );

  return {
    imports: [schemaImport],
    exports: [schemaJsonExport, schemaExport]
  };
};
