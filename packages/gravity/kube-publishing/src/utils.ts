//
// Copyright 2023 DXOS.org
//

import { spawn } from 'child_process';
import type { SpawnOptions } from 'child_process';

export const run = async (command: string, args: string[], options?: SpawnOptions) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`command failed: ${command} ${args.join(' ')}`));
        return;
      }
      resolve();
    });
  });

export const log = (message: string) => {
  console.log(`\x1b[33m [${new Date().toISOString()}] ${message}\x1b[0m`);
};
