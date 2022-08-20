//
// Copyright 2022 DXOS.org
//

import { resolve } from 'path';

import { logger } from './logger';
import { ModuleSpecifier } from './module-specifier';
import { parseAndGenerateSchema } from './type-generator';

export const build = async ({
  outdir,
  proto,
  substitutions
}: {
  outdir: string
  proto: string[]
  substitutions?: string
}) => {
  const substitutionsModule = substitutions ? ModuleSpecifier.resolveFromFilePath(substitutions, process.cwd()) : undefined;
  const protoFilePaths = proto.map((file: string) => resolve(process.cwd(), file));
  const outdirPath = resolve(process.cwd(), outdir);

  logger.logCompilationOptions(substitutionsModule, protoFilePaths, outdirPath);

  await parseAndGenerateSchema(substitutionsModule, protoFilePaths, outdirPath);
};
