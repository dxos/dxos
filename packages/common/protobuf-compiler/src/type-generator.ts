//
// Copyright 2020 DXOS.org
//

import {existsSync, mkdirSync, writeFileSync} from 'fs';
import {dirname, join} from 'path';
import pb from 'protobufjs';
import * as ts from 'typescript';

import {createDeclarations, createTypeDictionary} from './generator/declaration-generator';
import {logger} from './logger';
import {ModuleSpecifier} from './module-specifier';
import {getSafeNamespaceIdentifier, parseFullyQualifiedName, splitSchemaIntoNamespaces} from './namespaces';
import {registerResolver} from './parser/resolver';
import {createSerializerDefinition} from './generator/serializer-definition-generator';
import {parseSubstitutionsFile, SubstitutionsMap} from './parser/substitutions-parser';

const f = ts.factory;

registerResolver();

export async function compileSchema (substitutionsModule: ModuleSpecifier | undefined, protoFiles: string[], outDirPath: string) {
  const substitutions = substitutionsModule ? parseSubstitutionsFile(substitutionsModule.resolve()) : {};
  logger.logParsedSubstitutions(substitutions);

  const root = await pb.load(protoFiles);

  const namespaces = splitSchemaIntoNamespaces(root);

  for (const [namespace, types] of namespaces) {
    const outFile = join(outDirPath, getFileNameForNamespace(namespace));

    const generatedSourceFile = createNamespaceSourceFile(types, substitutions, outFile, outDirPath, namespace, substitutionsModule, namespaces);

    const printer = ts.createPrinter();
    const source = printer.printFile(generatedSourceFile);

    if (!existsSync(dirname(outFile))) {
      mkdirSync(dirname(outFile), { recursive: true });
    }
    writeFileSync(outFile, source);
  }

  const generatedSourceFile = createIndexSourceFile(substitutionsModule, root, outDirPath, namespaces);

  const printer = ts.createPrinter();
  const source = printer.printFile(generatedSourceFile);

  writeFileSync(join(outDirPath, 'index.ts'), source);
}

function createNamespaceSourceFile(types: pb.ReflectionObject[], substitutions: SubstitutionsMap, outFile: string, outDir: string, namespace: string, substitutionsModule: ModuleSpecifier | undefined, namespaces: Map<string, pb.ReflectionObject[]>) {
  const declarations: ts.Statement[] = Array.from(createDeclarations(types, substitutions));

  const substitutionsIdentifier = ts.factory.createIdentifier('substitutions');
  const substitutionsImport = substitutionsModule && ts.factory.createImportDeclaration(
      [],
      [],
      ts.factory.createImportClause(false, substitutionsIdentifier, undefined),
      ts.factory.createStringLiteral(substitutionsModule.importSpecifier(dirname(outFile)))
  );

  const otherNamespaceImports = Array.from(namespaces.keys())
      .filter(ns => ns !== namespace)
      .sort((b, a) => b.localeCompare(a))
      .map(ns => f.createImportDeclaration(
          [],
          [],
          f.createImportClause(false, undefined, f.createNamespaceImport(f.createIdentifier(getSafeNamespaceIdentifier(parseFullyQualifiedName(ns))))),
          f.createStringLiteral(ModuleSpecifier.resolveFromFilePath(getFileNameForNamespace(ns), outDir).importSpecifier(dirname(outFile)))
      ));

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

function createIndexSourceFile(substitutionsModule: ModuleSpecifier | undefined, root: pb.Root, outDirPath: string, namespaces: Map<string, pb.ReflectionObject[]>) {
  const {
    imports: schemaImports,
    exports: schemaExports
  } = createSerializerDefinition(substitutionsModule, root, outDirPath);

  const otherNamespaceImports = Array.from(namespaces.keys())
    .sort((b, a) => b.localeCompare(a))
    .map(ns => f.createImportDeclaration(
      [],
      [],
      f.createImportClause(false, undefined, f.createNamespaceImport(f.createIdentifier(getSafeNamespaceIdentifier(parseFullyQualifiedName(ns))))),
      f.createStringLiteral(ModuleSpecifier.resolveFromFilePath(getFileNameForNamespace(ns), outDirPath).importSpecifier(outDirPath))
    ));

  return ts.factory.createSourceFile(
    [
      ...schemaImports,
      ...otherNamespaceImports,
      createTypeDictionary(root),
      ...schemaExports
    ],
    ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
    ts.NodeFlags.None
  );
}

function getFileNameForNamespace (namespace: string) {
  const name = parseFullyQualifiedName(namespace);
  return `${name.join('/')}.ts`;
}
