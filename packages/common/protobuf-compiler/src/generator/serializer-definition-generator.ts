//
// Copyright 2020 DXOS.org
//

import protobufjs from 'protobufjs';
import * as ts from 'typescript';

import { CODEC_MODULE, ModuleSpecifier } from '../module-specifier';

const f = ts.factory;

export function createSerializerDefinition (substitutionsModule: ModuleSpecifier | undefined, root: protobufjs.Root, outFileDir: string): { imports: ts.Statement[], exports: ts.Statement[] } {
  const schemaIdentifier = f.createIdentifier('Schema');

  const schemaImport = f.createImportDeclaration(
    [],
    [],
    f.createImportClause(false, undefined, f.createNamedImports([
      f.createImportSpecifier(undefined, schemaIdentifier)
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
          [f.createStringLiteral(JSON.stringify(postprocessProtobufJson(root.toJSON())))]
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
          [f.createTypeReferenceNode('TYPES')],
          substitutionsModule ? [schemaJsonIdentifier, substitutionsIdentifier] : [schemaJsonIdentifier]
        )
      )
    ], ts.NodeFlags.Const)
  );

  return {
    imports: [schemaImport],
    exports: [schemaJsonExport, schemaExport]
  };
}

interface ProtobufJson {
  nested?: Record<string, ProtobufJson>
  [K: string]: any
}

function postprocessProtobufJson (protobufJson: ProtobufJson): ProtobufJson {
  if (!protobufJson.nested) {
    return protobufJson;
  }

  const newNested = Object.fromEntries(Object.entries(protobufJson.nested)
    .sort((b, a) => b[0].localeCompare(a[0]))
    .map(([key, value]) => [key, postprocessProtobufJson(value)]));

  return {
    ...protobufJson,
    nested: newNested
  };
}
