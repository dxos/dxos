//
// Copyright 2022 DXOS.org
//

import type { ExecutorContext } from '@nrwl/devkit';
import { sync as glob } from 'glob';
import { rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { resolve } from 'path';

import { build } from './build';

export interface GenerateExecutorOptions {
  basePath: string
  srcPath: string
  outputPath: string
  substitutionsPath: string
}

export default async (options: GenerateExecutorOptions, context: ExecutorContext): Promise<{ success: boolean }> => {
  console.info('Executing "generate"...');
  console.info(`Options: ${JSON.stringify(options, null, 2)}`);

  const src = join(options.basePath, options.srcPath);
  const substitutionsPath = join(options.basePath, options.substitutionsPath);
  const baseDir = resolve(process.cwd(), options.basePath);
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
    outDir
  });

  return { success: true };
};
