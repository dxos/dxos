//
// Copyright 2022 DXOS.org
//

// TODO(wittjosiah): Factor out.

import { spawn, SpawnSyncOptionsWithBufferEncoding } from 'child_process';

export const getBin = (root: string, binary: string) => {
  return `${root}/node_modules/.bin/${binary}`;
};

export const execTool = async (name: string, args: string[] = [], opts?: SpawnSyncOptionsWithBufferEncoding) => {
  const child = spawn(name, args, {
    stdio: 'inherit',
    ...opts
  });

  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.on('exit', (code) => {
      resolve(code);
    });
  });

  return exitCode;
};
