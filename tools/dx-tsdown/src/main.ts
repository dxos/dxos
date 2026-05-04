//
// Copyright 2026 DXOS.org
//

import { rm } from 'node:fs/promises';
import { build } from 'tsdown';

import { defineConfig, type DxTsdownOptions } from './config.ts';

export type { DxTsdownOptions as TsdownExecutorOptions } from './config.ts';

const cleanDir = async (path: string) => {
  await rm(path, { recursive: true, force: true });
};

export default async (options: DxTsdownOptions): Promise<{ success: boolean }> => {
  const { platform = ['browser', 'node'], outputPath = 'dist/lib' } = options;

  const dirsToClear: string[] = [];
  if (platform.includes('browser')) {
    dirsToClear.push(`${outputPath}/browser`);
  }
  if (platform.includes('node')) {
    dirsToClear.push(`${outputPath}/node-esm`);
  }
  if (platform.includes('neutral')) {
    dirsToClear.push(`${outputPath}/neutral`);
  }
  dirsToClear.push('dist/types');
  await Promise.all(dirsToClear.map(cleanDir));

  const configs = defineConfig(options);

  try {
    await Promise.all(configs.map((c) => build(c)));
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false };
  }
};
