import type { ExecutorContext } from '@nrwl/devkit';
import { sync as glob } from 'glob';
import { rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { build } from './build';

export interface GenerateExecutorOptions {
  basePath: string
  srcPath: string
  outputPath: string
  substitutionsPath: string
}

export default async function generateExecutor(
  options: GenerateExecutorOptions,
  context: ExecutorContext
): Promise<{ success: boolean }> {
  console.info(`Executing "generate"...`);
  console.info(`Options: ${JSON.stringify(options, null, 2)}`);

  const outdir = join(options.basePath, options.outputPath);
  const src = join(options.basePath, options.srcPath);
  const substitutionsPath = join(options.basePath, options.substitutionsPath);

  try {
    rmSync(outdir, { recursive: true, force: true });
  } catch (err: any) {
    err(err.message);
  }

  const substitutions = existsSync(substitutionsPath) ? substitutionsPath : undefined
  const proto = glob(src, { cwd: context.cwd });

  await build({
    outdir,
    proto,
    substitutions
  });

  return { success: true };
}
