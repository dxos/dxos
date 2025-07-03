//
// Copyright 2022 DXOS.org
//

import type { ExecutorContext } from '@nx/devkit';
import { sync as glob } from 'glob';
import { rmSync, existsSync } from 'node:fs';
import { register } from 'node:module';
import { join, resolve } from 'node:path';

register('extensionless', `file://${__filename}`);

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

// TODO(dmaretskyi): Workaround for a) NX running executors directy from source in v21; and b) transpiling them with "module": "commonjs", which turns `await import` into a `require`.
// NOTE: Changing local tsconfig had no effect.
// eslint-disable-next-line no-new-func
const asyncImport = new Function('path', 'return import(path)');

export default async (options: GenerateExecutorOptions, context: ExecutorContext): Promise<{ success: boolean }> => {
  const { ModuleSpecifier, parseAndGenerateSchema, preconfigureProtobufjs, registerResolver } =
    await asyncImport('@dxos/protobuf-compiler');

  console.info('Executing protobuf generator...');
  if (context.isVerbose) {
    console.info(`Options: ${JSON.stringify(options, null, 2)}`);
  }

  const src = join(options.basePath, options.srcPath);
  const substitutionsPath = join(options.basePath, options.substitutionsPath);
  const baseDir = resolve(context.cwd, options.basePath);
  const outDir = join(options.basePath, options.outputPath);
  const packageRoot = context.projectsConfigurations!.projects[context.projectName!].root;

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
