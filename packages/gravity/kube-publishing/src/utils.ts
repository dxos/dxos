//
// Copyright 2023 DXOS.org
//

import { spawn, type SpawnOptions } from 'node:child_process';

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
