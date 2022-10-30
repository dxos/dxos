//
// Copyright 2022 DXOS.org
//

import type { ExecutorContext } from '@nrwl/devkit';
import { exec } from 'child_process';
import { resolve } from 'path';
import { promisify } from 'util';

export interface MochaExecutorOptions {
  testPatterns: string[];
  config: string;
}

export default async (options: MochaExecutorOptions, context: ExecutorContext): Promise<{ success: boolean }> => {
  console.info('Executing playwright...');
  if (context.isVerbose) {
    console.info(`Options: ${JSON.stringify(options, null, 2)}`);
  }

  // TODO(wittjosiah): Run dev server.

  // Based on https://github.com/marksandspencer/nx-plugins/blob/2a46e582e59512ea4caae20cbdc30103d0d1921b/packages/nx-playwright/src/executors/playwright-executor/executor.ts#L24.
  const success = await Promise.resolve()
    .then(async () => {
      const args = [
        `--config ${resolve(context.root, options.config)}`,
        ...options.testPatterns.map((pattern) => resolve(context.root, pattern))
      ];

      // TODO(wittjosiah): Run playwright programatically.
      //   https://github.com/microsoft/playwright/issues/7275
      const { stdout, stderr } = await promisify(exec)(`playwright test ${args.join(' ')}`);

      console.info(`Playwright output ${stdout}`);
      if (stderr) {
        console.error(`Playwright errors ${stderr}`);
      }

      return stdout.includes('passed');
    })
    .catch((error) => {
      console.error('Unexpected error', error);
      return false;
    });

  return { success };
};
