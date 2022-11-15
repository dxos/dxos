//
// Copyright 2022 DXOS.org
//

import type { ExecutorContext } from '@nrwl/devkit';
import { sync as glob } from 'glob';
import { rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { resolve } from 'path';

import { preconfigureProtobufjs } from './configure';
import { logger } from './logger';
import { ModuleSpecifier } from './module-specifier';
import { registerResolver } from './parser';
import { parseAndGenerateSchema } from './type-generator';

export interface GenerateExecutorOptions {
  basePath: string;
  srcPath: string;
  outputPath: string;
  substitutionsPath: string;
  exportPath?: string
}

export default async (options: GenerateExecutorOptions, context: ExecutorContext): Promise<{ success: boolean }> => {
  console.info('Executing generate...');
  if (context.isVerbose) {
    console.info(`Options: ${JSON.stringify(options, null, 2)}`);
  }

  const src = join(options.basePath, options.srcPath);
  const substitutionsPath = join(options.basePath, options.substitutionsPath);
  const baseDir = resolve(process.cwd(), options.basePath);
  const outDir = join(options.basePath, options.outputPath);
  const packageRoot = context.workspace.projects[context.projectName!].root;

  try {
    rmSync(outDir, { recursive: true, force: true });
  } catch (err: any) {
    err(err.message);
  }

  const substitutions = existsSync(substitutionsPath) ? substitutionsPath : undefined;
  const proto = glob(src, { cwd: context.cwd });

  const substitutionsModule = substitutions
    ? ModuleSpecifier.resolveFromFilePath(substitutions, process.cwd())
    : undefined;
  const protoFilePaths = proto.map((file: string) => resolve(process.cwd(), file));
  const outdirPath = resolve(process.cwd(), outDir);

  // Initialize.
  registerResolver(baseDir);
  preconfigureProtobufjs();

  logger.logCompilationOptions(substitutionsModule, protoFilePaths, baseDir, outdirPath);
  await parseAndGenerateSchema(substitutionsModule, protoFilePaths, baseDir, outdirPath, packageRoot, options.exportPath);

  return { success: true };
};
