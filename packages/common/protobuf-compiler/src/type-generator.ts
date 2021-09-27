//
// Copyright 2020 DXOS.org
//

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import pb from 'protobufjs';
import * as ts from 'typescript';

import { createDeclarations, createServicesDictionary, createTypeDictionary } from './generator/declaration-generator';
import { createSerializerDefinition } from './generator/serializer-definition-generator';
import { logger } from './logger';
import { CODEC_MODULE, ModuleSpecifier } from './module-specifier';
import { getSafeNamespaceIdentifier, parseFullyQualifiedName, splitSchemaIntoNamespaces } from './namespaces';
import { registerResolver, parseSubstitutionsFile, SubstitutionsMap } from './parser';

const f = ts.factory;

registerResolver();

export async function parseAndGenerateSchema (substitutionsModule: ModuleSpecifier | undefined, protoFiles: string[], outDirPath: string) {
  const substitutions = substitutionsModule ? parseSubstitutionsFile(substitutionsModule.resolve()) : {};
  logger.logParsedSubstitutions(substitutions);

  const root = await pb.load(protoFiles);

  await generateSchema({
    schema: root,
    outDir: outDirPath,
    substitutions: substitutions
      ? {
          map: substitutions,
          module: substitutionsModule!
        }
      : undefined
  });
}

export interface GenerateSchemaOptions {
  schema: pb.Root
  outDir: string
  substitutions?: {
    map: SubstitutionsMap,
    module: ModuleSpecifier
  }
}

/**
 * Generate typescript definitions for a given schema and write them to `options.outDir`.
 */
export function generateSchema (options: GenerateSchemaOptions) {
  const namespaces = splitSchemaIntoNamespaces(options.schema);

  const printer = ts.createPrinter();

  for (const [namespace, types] of namespaces) {
    const outFile = join(options.outDir, getFileNameForNamespace(namespace));

    const generatedSourceFile = createNamespaceSourceFile(
      types,
      options.substitutions?.map ?? {},
      options.outDir,
      namespace,
      options.substitutions?.module,
      Array.from(namespaces.keys())
    );

    const source = printer.printFile(generatedSourceFile);

    if (!existsSync(dirname(outFile))) {
      mkdirSync(dirname(outFile), { recursive: true });
    }
    writeFileSync(outFile, source);
  }

  const generatedSourceFile = createIndexSourceFile(options.substitutions?.module, options.schema, options.outDir, Array.from(namespaces.keys()));

  const source = printer.printFile(generatedSourceFile);

  writeFileSync(join(options.outDir, 'index.ts'), source);
}

function createSubstitutionsImport (substitutionsModule: ModuleSpecifier, context: string) {
  return substitutionsModule && ts.factory.createImportDeclaration(
    [],
    [],
    ts.factory.createImportClause(false, ts.factory.createIdentifier('substitutions'), undefined),
    ts.factory.createStringLiteral(substitutionsModule.importSpecifier(context))
  );
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

  const substitutionsImport = substitutionsModule && createSubstitutionsImport(substitutionsModule, dirname(outFile));

  const otherNamespaceImports = createNamespaceImports(otherNamespaces.filter(ns => ns !== namespace), outDir, dirname(outFile));

  return ts.factory.createSourceFile(
    [
      createStreamImport(),
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

  const substitutionsImport = substitutionsModule && createSubstitutionsImport(substitutionsModule, outDirPath);
  const otherNamespaceImports = createNamespaceImports(namespaces, outDirPath, outDirPath);

  return ts.factory.createSourceFile(
    [
      ...schemaImports,
      ...otherNamespaceImports,
      ...(substitutionsImport ? [substitutionsImport] : []),
      createTypeDictionary(root),
      createServicesDictionary(root),
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

function createStreamImport () {
  return f.createImportDeclaration(
    [],
    [],
    f.createImportClause(false, undefined, f.createNamedImports([
      f.createImportSpecifier(undefined, f.createIdentifier('Stream'))
    ])),
    f.createStringLiteral(CODEC_MODULE.importSpecifier(''))
  );
}
