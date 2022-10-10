//
// Copyright 2022 DXOS.org
//

import { resolve } from 'path';

import { preconfigureProtobufjs } from './configure.js';
import { logger } from './logger.js';
import { ModuleSpecifier } from './module-specifier.js';
import { registerResolver } from './parser/index.js';
import { parseAndGenerateSchema } from './type-generator.js';

export const build = async ({
  proto,
  substitutions,
  baseDir,
  outDir
}: {
  proto: string[]
  substitutions?: string
  baseDir: string | undefined
  outDir: string
}) => {
  const substitutionsModule = substitutions ? ModuleSpecifier.resolveFromFilePath(substitutions, process.cwd()) : undefined;
  const protoFilePaths = proto.map((file: string) => resolve(process.cwd(), file));
  const outdirPath = resolve(process.cwd(), outDir);

  // Initialize.
  registerResolver(baseDir);
  preconfigureProtobufjs();

  logger.logCompilationOptions(substitutionsModule, protoFilePaths, baseDir, outdirPath);
  await parseAndGenerateSchema(substitutionsModule, protoFilePaths, baseDir, outdirPath);
};
