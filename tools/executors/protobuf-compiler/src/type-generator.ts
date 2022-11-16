//
// Copyright 2020 DXOS.org
//

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import pb from 'protobufjs';
import * as ts from 'typescript';

import {
  createIndexSourceFile,
  createNamespaceSourceFile,
  getFileNameForNamespace,
  generatePackageExports
} from './generator';
import { Logger } from './logger';
import { ModuleSpecifier } from './module-specifier';
import { splitSchemaIntoNamespaces } from './namespaces';
import { parseSubstitutionsFile, SubstitutionsMap } from './parser';

// TODO(dmaretskyi): Move all parsing into `generateSchema` and remove this function.
export const parseAndGenerateSchema = async (
  substitutionsModule: ModuleSpecifier | undefined,
  protoFiles: string[],
  baseDirPath: string | undefined,
  outDirPath: string,
  packageRoot: string,
  exportPath?: string,
  verbose = false
) => {
  const logger = new Logger({ verbose });
  logger.logCompilationOptions(protoFiles, baseDirPath, outDirPath);

  const root = await pb.load(protoFiles);
  const substitutions = substitutionsModule ? parseSubstitutionsFile(substitutionsModule.resolve()) : {};
  for (const fqn of Object.keys(substitutions)) {
    if (!root.lookup(fqn)) {
      throw new Error(`No protobuf definition found matching the substitution: ${fqn}`);
    }
  }

  if (substitutionsModule) {
    logger.logParsedSubstitutions(substitutionsModule, substitutions);
  }

  await generateSchema({
    schema: root,
    substitutions: substitutions ? { map: substitutions, module: substitutionsModule! } : undefined,
    baseDir: baseDirPath,
    outDir: outDirPath,
    packageRoot,
    exportPath
  });
};

export interface GenerateSchemaOptions {
  schema: pb.Root;
  substitutions?: {
    map: SubstitutionsMap;
    module: ModuleSpecifier;
  };
  baseDir: string | undefined;
  outDir: string;
  packageRoot: string;
  exportPath?: string;
}

/**
 * Generate typescript definitions for a given schema and write them to `options.outDir`.
 */
export const generateSchema = (options: GenerateSchemaOptions) => {
  const namespaces = splitSchemaIntoNamespaces(options.schema);
  const printer = ts.createPrinter();

  for (const [namespace, types] of namespaces) {
    const generatedSourceFile = createNamespaceSourceFile(
      types,
      options.substitutions?.map ?? {},
      options.outDir,
      namespace,
      options.substitutions?.module,
      Array.from(namespaces.keys())
    );

    const outFile = join(options.outDir, getFileNameForNamespace(namespace));
    if (!existsSync(dirname(outFile))) {
      mkdirSync(dirname(outFile), { recursive: true });
    }

    const source = printer.printFile(generatedSourceFile);
    writeFileSync(outFile, source);
  }

  const source = printer.printFile(
    createIndexSourceFile(options.substitutions?.module, options.schema, options.outDir, Array.from(namespaces.keys()))
  );
  writeFileSync(join(options.outDir, 'index.ts'), source);

  if (options.exportPath) {
    generatePackageExports({
      packageRoot: options.packageRoot,
      exportFrom: options.exportPath,
      namespaces: Array.from(namespaces.keys())
    });
  }
};
