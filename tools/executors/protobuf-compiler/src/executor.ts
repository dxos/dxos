//
// Copyright 2022 DXOS.org
//

import type { ExecutorContext } from '@nrwl/devkit';
import { sync as glob } from 'glob';
import { rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { resolve } from 'path';

import { build } from './build';
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
  packageExports: boolean;
}

export default async (options: GenerateExecutorOptions, context: ExecutorContext): Promise<{ success: boolean }> => {
  console.info('Executing protobuf generator...');
  if (context.isVerbose) {
    console.info(`Options: ${JSON.stringify(options, null, 2)}`);
  }

  // TODO(burdon): Path options aren't "balanced".
  const src = join(options.basePath, options.srcPath);
  const substitutionsPath = join(options.basePath, options.substitutionsPath);
  const baseDir = resolve(context.cwd, options.basePath);
  const outDir = join(options.basePath, options.outputPath);
  const packageRoot = context.workspace.projects[context.projectName!].root;

  // console.log({
  //   options,
  //   cwd: context.cwd,
  //   src,
  //   substitutionsPath,
  //   baseDir,
  //   outDir,
  //   packageRoot
  // })

  try {
    rmSync(outDir, { recursive: true, force: true });
  } catch (err: any) {
    err(err.message);
  }

  const substitutions = existsSync(substitutionsPath) ? substitutionsPath : undefined;
  const proto = glob(src, { cwd: context.cwd });


  // TODO(burdon): Use context.cwd.
  const substitutionsModule = substitutions
    ? ModuleSpecifier.resolveFromFilePath(substitutions, process.cwd())
    : undefined;
  const protoFilePaths = proto.map((file: string) => resolve(process.cwd(), file));
  const outDirPath = resolve(process.cwd(), outDir);

  // Initialize.
  registerResolver(baseDir);
  preconfigureProtobufjs();

  logger.logCompilationOptions(protoFilePaths, baseDir, outDirPath, context.isVerbose);
  await parseAndGenerateSchema(substitutionsModule, protoFilePaths, baseDir, outDirPath, packageRoot, context.isVerbose, options.packageExports);

  return { success: true };
};
