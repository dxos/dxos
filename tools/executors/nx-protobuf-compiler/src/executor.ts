//
// Copyright 2022 DXOS.org
//

import type { ExecutorContext } from '@nx/devkit';
import { sync as glob } from 'glob';
import { rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  ModuleSpecifier,
  parseAndGenerateSchema,
  preconfigureProtobufjs,
  registerResolver,
} from '@dxos/protobuf-compiler';

export interface GenerateExecutorOptions {
  basePath: string;
  srcPath: string;
  outputPath: string;
  substitutionsPath: string;
  /**
   * @deprecated use package.json exports instead.
   */
  exportPath?: string;
  compress: boolean;
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
  // TODO(wittjosiah): Workspace from context is deprecated.
  const packageRoot = context.workspace!.projects[context.projectName!].root;

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
  const outDirPath = resolve(process.cwd(), outDir);

  // Initialize.
  registerResolver(baseDir);
  preconfigureProtobufjs();

  await parseAndGenerateSchema(
    substitutionsModule,
    protoFilePaths,
    baseDir,
    outDirPath,
    packageRoot,
    options.exportPath,
    options.compress,
    context.isVerbose,
  );

  return { success: true };
};
