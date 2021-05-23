//
// Copyright 2020 DXOS.org
//

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import pb from 'protobufjs';
import * as ts from 'typescript';

import { createDeclarations, createTypeDictionary } from './generator/declaration-generator';
import { createSerializerDefinition } from './generator/serializer-definition-generator';
import { logger } from './logger';
import { ModuleSpecifier } from './module-specifier';
import { getSafeNamespaceIdentifier, parseFullyQualifiedName, splitSchemaIntoNamespaces } from './namespaces';
import { registerResolver } from './parser/resolver';
import { parseSubstitutionsFile, SubstitutionsMap } from './parser/substitutions-parser';

const f = ts.factory;

registerResolver();

export async function compileSchema (substitutionsModule: ModuleSpecifier | undefined, protoFiles: string[], outDirPath: string) {
  const substitutions = substitutionsModule ? parseSubstitutionsFile(substitutionsModule.resolve()) : {};
  logger.logParsedSubstitutions(substitutions);

  const root = await pb.load(protoFiles);

  const namespaces = splitSchemaIntoNamespaces(root);

  const printer = ts.createPrinter();

  for (const [namespace, types] of namespaces) {
    const outFile = join(outDirPath, getFileNameForNamespace(namespace));

    const generatedSourceFile = createNamespaceSourceFile(types, substitutions, outDirPath, namespace, substitutionsModule, Array.from(namespaces.keys()));

    const source = printer.printFile(generatedSourceFile);

    if (!existsSync(dirname(outFile))) {
      mkdirSync(dirname(outFile), { recursive: true });
    }
    writeFileSync(outFile, source);
  }

  const generatedSourceFile = createIndexSourceFile(substitutionsModule, root, outDirPath, Array.from(namespaces.keys()));

  const source = printer.printFile(generatedSourceFile);

  writeFileSync(join(outDirPath, 'index.ts'), source);
}

function createSubstitutionsImport (substitutionsModule: ModuleSpecifier | undefined, context: string) {
  const substitutionsIdentifier = ts.factory.createIdentifier('substitutions');
  const substitutionsImport = substitutionsModule && ts.factory.createImportDeclaration(
    [],
    [],
    ts.factory.createImportClause(false, substitutionsIdentifier, undefined),
    ts.factory.createStringLiteral(substitutionsModule.importSpecifier(context))
  );
  return substitutionsImport;
}

function createNamespaceSourceFile (
  types: pb.ReflectionObject[],
  substitutions: SubstitutionsMap,
  outDir: string,
  namespace: string,
  substitutionsModule: ModuleSpecifier | undefined,
  otherNamespaces: string[]
) {
  const outFile = join(outDir, getFileNameForNamespace(namespace));
  const declarations: ts.Statement[] = Array.from(createDeclarations(types, substitutions));

  const substitutionsImport = createSubstitutionsImport(substitutionsModule, dirname(outFile));

  const otherNamespaceImports = createNamespaceImports(otherNamespaces.filter(ns => ns !== namespace), outDir, dirname(outFile));

  return ts.factory.createSourceFile(
    [
      ...(substitutionsImport ? [substitutionsImport] : []),
      ...otherNamespaceImports,
      ...declarations
    ],
    ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
    ts.NodeFlags.None
  );
}

function createIndexSourceFile (substitutionsModule: ModuleSpecifier | undefined, root: pb.Root, outDirPath: string, namespaces: string[]) {
  const {
    imports: schemaImports,
    exports: schemaExports
  } = createSerializerDefinition(substitutionsModule, root, outDirPath);

  const substitutionsImport = createSubstitutionsImport(substitutionsModule, outDirPath);
  const otherNamespaceImports = createNamespaceImports(namespaces, outDirPath, outDirPath);

  return ts.factory.createSourceFile(
    [
      ...schemaImports,
      ...otherNamespaceImports,
      ...(substitutionsImport ? [substitutionsImport] : []),
      createTypeDictionary(root),
      ...schemaExports
    ],
    ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
    ts.NodeFlags.None
  );
}

function createNamespaceImports (namespaces: string[], outDirPath: string, context: string) {
  return namespaces
    .sort((b, a) => b.localeCompare(a))
    .map(ns => f.createImportDeclaration(
      [],
      [],
      f.createImportClause(false, undefined, f.createNamespaceImport(f.createIdentifier(getSafeNamespaceIdentifier(parseFullyQualifiedName(ns))))),
      f.createStringLiteral(ModuleSpecifier.resolveFromFilePath(getFileNameForNamespace(ns), outDirPath).importSpecifier(context))
    ));
}

function getFileNameForNamespace (namespace: string) {
  const name = parseFullyQualifiedName(namespace);
  return `${name.join('/')}.ts`;
}
