//
// Copyright 2022 DXOS.org
//

// TODO(wittjosiah): Factor out.

import { spawn, SpawnSyncOptionsWithBufferEncoding } from 'node:child_process';

export const getBin = (root: string, binary: string) => {
  return `${root}/node_modules/.bin/${binary}`;
};

export const execTool = async (
  name: string,
  args: string[] = [],
  opts: SpawnSyncOptionsWithBufferEncoding = {}
) => {
  const child = spawn(name, args, opts);

  // NOTE: Inheriting stdio of child process breaks Nx CLI output.
  child.stdout?.on('data', (data: Buffer) =>
    process.stdout.write(data.toString('utf8'))
  );
  child.stderr?.on('data', (data: Buffer) =>
    process.stderr.write(data.toString('utf8'))
  );

  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.on('exit', (code) => {
      resolve(code);
    });
  });

  return exitCode;
};
