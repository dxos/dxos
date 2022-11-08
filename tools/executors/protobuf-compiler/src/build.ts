//
// Copyright 2022 DXOS.org
//

import { resolve } from 'path';

import { preconfigureProtobufjs } from './configure';
import { logger } from './logger';
import { ModuleSpecifier } from './module-specifier';
import { registerResolver } from './parser';
import { parseAndGenerateSchema } from './type-generator';

export const build = async ({
  proto,
  substitutions,
  baseDir,
  outDir,
  verbose = false
}: {
  proto: string[];
  substitutions?: string;
  baseDir: string | undefined;
  outDir: string;
  verbose: boolean;
}) => {
  // TODO(burdon): Use context.cwd.
  const substitutionsModule = substitutions
    ? ModuleSpecifier.resolveFromFilePath(substitutions, process.cwd())
    : undefined;
  const protoFilePaths = proto.map((file: string) => resolve(process.cwd(), file));
  const outDirPath = resolve(process.cwd(), outDir);

  // Initialize.
  registerResolver(baseDir);
  preconfigureProtobufjs();

  logger.logCompilationOptions(protoFilePaths, baseDir, outDirPath, verbose);
  await parseAndGenerateSchema(substitutionsModule, protoFilePaths, baseDir, outDirPath, verbose);
};
