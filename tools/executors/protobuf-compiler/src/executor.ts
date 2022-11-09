//
// Copyright 2022 DXOS.org
//

import type { ExecutorContext } from '@nrwl/devkit';
import { sync as glob } from 'glob';
import { rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { resolve } from 'path';

import { build } from './build';
import { TypingsGenerator } from './typings-generator';

export interface GenerateExecutorOptions {
  basePath: string;
  srcPath: string;
  outputPath: string;
  typingsOutputPath: string;
  substitutionsPath: string;
  verbose: boolean;
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

  try {
    rmSync(outDir, { recursive: true, force: true });
  } catch (err: any) {
    err(err.message);
  }

  const substitutions = existsSync(substitutionsPath) ? substitutionsPath : undefined;
  const proto = glob(src, { cwd: context.cwd });

  await build({
    proto,
    substitutions,
    baseDir,
    outDir,
    verbose: context.isVerbose
  });

  console.info({
    cwd: context.cwd,
    baseDir,
    outDir,
    options
  });

  // Typings.
  if (options.typingsOutputPath) {
    const typeGenerator = new TypingsGenerator({
      files: proto,
      baseDir: options.basePath,
      outDir: join(context.cwd, options.typingsOutputPath),
      // TODO(burdon): Fix definition and computation of relative paths.
      distDir: '../dist/src/proto/gen'
    });

    typeGenerator.generate(context.isVerbose);
  }

  return { success: true };
};
