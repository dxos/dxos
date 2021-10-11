//
// Copyright 2020 DXOS.org
//

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import pb from 'protobufjs';
import * as ts from 'typescript';

import { preconfigureProtobufjs } from './configure';
import { createIndexSourceFile, createNamespaceSourceFile, getFileNameForNamespace } from './generator/file-generator';
import { logger } from './logger';
import { ModuleSpecifier } from './module-specifier';
import { splitSchemaIntoNamespaces } from './namespaces';
import { parseSubstitutionsFile, registerResolver, SubstitutionsMap } from './parser';

registerResolver();
preconfigureProtobufjs();

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
