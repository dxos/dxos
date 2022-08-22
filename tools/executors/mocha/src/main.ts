//
// Copyright 2022 DXOS.org
//

import type { ExecutorContext } from '@nrwl/devkit';
import { exec } from 'child_process';
import { resolve } from 'path';
import { promisify } from 'util';

export interface MochaExecutorOptions {
  testPatterns: string[]
  jsdom: boolean
  forceExit: boolean
}

export default async (options: MochaExecutorOptions, context: ExecutorContext): Promise<{ success: boolean }> => {
  console.info('Executing "mocha"...');
  console.info(`Options: ${JSON.stringify(options, null, 2)}`);

  const args = [
    ...(options.jsdom ? ['-r jsdom-global/register'] : []),
    '-r @swc-node/register',
    `-r ${require.resolve('./util/react-setup.js')}`,
    `-r ${require.resolve('./util/catch-unhandled-rejections.js')}`,
    ...options.testPatterns.map(pattern => resolve(context.root, pattern)),
    options.forceExit ? '--exit' : '--no-exit',
    '-t 15000'
  ];

  const { stdout, stderr } = await promisify(exec)(
    `mocha ${args.join(' ')}`
  );
  console.log(stdout);
  console.error(stderr);

  const success = !stderr;
  return { success };
};
