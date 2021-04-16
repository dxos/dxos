//
// Copyright 2020 DXOS.org
//

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import protobufjs from 'protobufjs';
import * as ts from 'typescript';

import { createDeclarations, createTypeDictinary } from './declaration-generator';
import { logger } from './logger';
import { ModuleSpecifier } from './module-specifier';
import { getSafeNamespaceIdentifier, parseFullyQualifiedName, splitSchemaIntoNamespaces } from './namespaces';
import { registerResolver } from './resolver';
import { createSerializerDefinition } from './serializer-definition-generator';
import { parseSubstitutionsFile } from './substitutions-parser';

const f = ts.factory;

registerResolver();

export async function compileSchema (substitutionsModule: ModuleSpecifier | undefined, protoFiles: string[], outDirPath: string) {
  const { imports, substitutions } = substitutionsModule ? parseSubstitutionsFile(substitutionsModule.resolve()) : { imports: [], substitutions: {} };
  logger.logParsedSubstitutions(substitutions);

  const root = await protobufjs.load(protoFiles);

  const namespaces = splitSchemaIntoNamespaces(root);

  for (const [namespace, types] of namespaces) {
    const declarations: ts.Statement[] = Array.from(createDeclarations(types, substitutions));
    const outFile = join(outDirPath, getFileNameForNamespace(namespace));

    const importDeclarations = imports.map(decriptor => f.createImportDeclaration(
      [],
      [],
      decriptor.clause,
      ts.factory.createStringLiteral(decriptor.module.importSpecifier(dirname(outFile)))
    ));

    const otherNamespaceImports = Array.from(namespaces.keys())
      .filter(ns => ns !== namespace)
      .sort((b, a) => b.localeCompare(a))
      .map(ns => f.createImportDeclaration(
        [],
        [],
        f.createImportClause(false, undefined, f.createNamespaceImport(f.createIdentifier(getSafeNamespaceIdentifier(parseFullyQualifiedName(ns))))),
        f.createStringLiteral(ModuleSpecifier.resolveFromFilePath(getFileNameForNamespace(ns), outDirPath).importSpecifier(dirname(outFile)))
      ));

    const generatedSourceFile = ts.factory.createSourceFile(
      [
        ...importDeclarations,
        ...otherNamespaceImports,
        ...declarations
      ],
      ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
      ts.NodeFlags.None
    );

    const printer = ts.createPrinter();
    const source = printer.printFile(generatedSourceFile);

    if (!existsSync(dirname(outFile))) {
      mkdirSync(dirname(outFile), { recursive: true });
    }
    writeFileSync(outFile, source);
  }

  const { imports: schemaImports, exports: schemaExports } = createSerializerDefinition(substitutionsModule, root, outDirPath);

  const importDeclarations = imports.map(decriptor => ts.factory.createImportDeclaration(
    [],
    [],
    decriptor.clause,
    ts.factory.createStringLiteral(decriptor.module.importSpecifier(outDirPath))
  ));

  const otherNamespaceImports = Array.from(namespaces.keys())
    .sort((b, a) => b.localeCompare(a))
    .map(ns => f.createImportDeclaration(
      [],
      [],
      f.createImportClause(false, undefined, f.createNamespaceImport(f.createIdentifier(getSafeNamespaceIdentifier(parseFullyQualifiedName(ns))))),
      f.createStringLiteral(ModuleSpecifier.resolveFromFilePath(getFileNameForNamespace(ns), outDirPath).importSpecifier(outDirPath))
    ));

  const generatedSourceFile = ts.factory.createSourceFile(
    [
      ...schemaImports,
      ...importDeclarations,
      ...otherNamespaceImports,
      createTypeDictinary(root),
      ...schemaExports
    ],
    ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
    ts.NodeFlags.None
  );

  const printer = ts.createPrinter();
  const source = printer.printFile(generatedSourceFile);

  writeFileSync(join(outDirPath, 'index.ts'), source);
}

function getFileNameForNamespace (namespace: string) {
  const name = parseFullyQualifiedName(namespace);
  return `${name.join('/')}.ts`;
}
